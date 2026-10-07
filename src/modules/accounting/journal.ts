import { SupabaseClient } from "@supabase/supabase-js";
import {
  JournalEntry,
  JournalSourceType,
} from "./types";

export interface CreateJournalLineInput {
  accountId: string;
  debit: number;
  credit: number;
  description?: string | null;
}

export interface PostJournalParams {
  businessId: string;
  journalDate: string; // YYYY-MM-DD
  description: string;
  sourceType: JournalSourceType;
  sourceId?: string | null;
  reference?: string | null;
  createdBy?: string | null;
  lines: CreateJournalLineInput[];
}

export interface VoidJournalParams {
  businessId: string;
  journalEntryId?: string;
  sourceType?: JournalSourceType;
  sourceId?: string;
  voidReason: string;
  actorUserId?: string | null;
}

/**
 * Posts a mathematically balanced double-entry journal entry to the general ledger.
 *
 * CRITICAL ACCOUNTING INVARIANTS:
 * 1. Total Debit MUST equal Total Credit.
 * 2. Total Debit MUST be greater than 0.
 * 3. Individual line cannot have both Debit > 0 and Credit > 0.
 * 4. All numbers are stored as integer BIGINT in IDR (zero floating point money).
 * 5. Idempotent on (business_id, source_type, source_id).
 */
export async function postJournalEntry(
  client: SupabaseClient,
  params: PostJournalParams
): Promise<JournalEntry> {
  const { businessId, journalDate, description, sourceType, sourceId, reference, createdBy, lines } = params;

  if (!businessId) {
    throw new Error("Business ID is required for posting journal entry.");
  }

  if (!lines || lines.length < 2) {
    throw new Error("Double-entry journal requires at least two lines.");
  }

  // 1. Verify idempotency
  if (sourceId) {
    const { data: existing } = await client
      .from("journal_entries")
      .select("*, journal_lines(*)")
      .eq("business_id", businessId)
      .eq("source_type", sourceType)
      .eq("source_id", sourceId)
      .neq("status", "voided")
      .maybeSingle();

    if (existing) {
      return mapRowToJournalEntry(existing);
    }
  }

  // 2. Validate Lines & Balance
  let totalDebit = 0;
  let totalCredit = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const debit = Math.round(Number(line.debit) || 0);
    const credit = Math.round(Number(line.credit) || 0);

    if (debit < 0 || credit < 0) {
      throw new Error(`Negative money value detected on journal line ${i + 1}`);
    }

    if (debit > 0 && credit > 0) {
      throw new Error(`Line ${i + 1} cannot have both Debit and Credit amounts.`);
    }

    if (debit === 0 && credit === 0) {
      throw new Error(`Line ${i + 1} has zero amount.`);
    }

    totalDebit += debit;
    totalCredit += credit;
  }

  if (totalDebit !== totalCredit) {
    throw new Error(
      `Journal Entry Imbalance: Total Debit (Rp ${totalDebit.toLocaleString()}) does not match Total Credit (Rp ${totalCredit.toLocaleString()}). Imbalance difference: Rp ${(totalDebit - totalCredit).toLocaleString()}`
    );
  }

  if (totalDebit <= 0) {
    throw new Error("Journal entry must have a non-zero financial value.");
  }

  // 3. Generate deterministic entry number
  const dateStr = journalDate.replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const entryNumber = `JRN-${dateStr}-${randomSuffix}`;

  // 4. Insert Journal Header
  const { data: entryData, error: entryErr } = await client
    .from("journal_entries")
    .insert({
      business_id: businessId,
      entry_number: entryNumber,
      journal_date: journalDate,
      description,
      source_type: sourceType,
      source_id: sourceId || null,
      status: "posted",
      reference: reference || null,
      created_by: createdBy || null,
      posted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (entryErr || !entryData) {
    throw new Error(`Failed to create journal entry header: ${entryErr?.message || "Unknown error"}`);
  }

  const journalEntryId = String(entryData.id);

  // 5. Insert Journal Lines
  const lineInserts = lines.map((l, idx) => ({
    journal_entry_id: journalEntryId,
    account_id: l.accountId,
    debit: Math.round(Number(l.debit) || 0),
    credit: Math.round(Number(l.credit) || 0),
    description: l.description || description,
    line_order: idx + 1,
  }));

  const { error: lineErr } = await client.from("journal_lines").insert(lineInserts);

  if (lineErr) {
    // Attempt rollback of header to maintain database cleanliness
    await client.from("journal_entries").delete().eq("id", journalEntryId);
    throw new Error(`Failed to insert journal lines: ${lineErr.message}`);
  }

  // 6. Record Audit Log
  try {
    await client.from("accounting_audit_logs").insert({
      business_id: businessId,
      actor_user_id: createdBy || null,
      action: "JOURNAL_POSTED",
      entity: "journal_entries",
      entity_id: journalEntryId,
      metadata: {
        entryNumber,
        sourceType,
        sourceId,
        totalDebit,
        lineCount: lines.length,
      },
    });
  } catch {
    // Non-blocking audit failure
  }

  return {
    id: journalEntryId,
    businessId,
    entryNumber,
    journalDate,
    description,
    sourceType,
    sourceId: sourceId || null,
    status: "posted",
    reference: reference || null,
    createdBy: createdBy || null,
    createdAt: String(entryData.created_at),
    postedAt: String(entryData.posted_at),
    voidedAt: null,
    voidReason: null,
    reversalEntryId: null,
    lines: lineInserts.map((l) => ({
      accountId: l.account_id,
      debit: l.debit,
      credit: l.credit,
      description: l.description,
      lineOrder: l.line_order,
    })),
  };
}

/**
 * Reverses and voids an existing posted journal entry.
 * Follows accounting GAAP standard: Original entry is flagged 'voided' and
 * an exact opposite reversing journal is posted. Historical entries are never deleted.
 */
export async function voidJournalEntry(
  client: SupabaseClient,
  params: VoidJournalParams
): Promise<{ original: JournalEntry; reversal: JournalEntry }> {
  const { businessId, journalEntryId, sourceType, sourceId, voidReason, actorUserId } = params;

  let query = client
    .from("journal_entries")
    .select("*, journal_lines(*)")
    .eq("business_id", businessId)
    .neq("status", "voided");

  if (journalEntryId) {
    query = query.eq("id", journalEntryId);
  } else if (sourceType && sourceId) {
    query = query.eq("source_type", sourceType).eq("source_id", sourceId);
  } else {
    throw new Error("Must specify journalEntryId or (sourceType and sourceId)");
  }

  const { data: original, error: fetchErr } = await query.maybeSingle();

  if (fetchErr || !original) {
    throw new Error("Active journal entry to void was not found.");
  }

  const origLines = (original.journal_lines || []) as Array<{
    account_id: string;
    debit: number;
    credit: number;
    description?: string;
  }>;

  if (origLines.length === 0) {
    throw new Error("Cannot void journal entry with no lines.");
  }

  // Construct reversal lines: Debit and Credit swapped
  const reversalLines: CreateJournalLineInput[] = origLines.map((l) => ({
    accountId: l.account_id,
    debit: l.credit, // SWAP
    credit: l.debit, // SWAP
    description: `[REVERSAL] ${original.description}`,
  }));

  const reversalEntry = await postJournalEntry(client, {
    businessId,
    journalDate: new Date().toISOString().slice(0, 10),
    description: `Reversal of ${original.entry_number}: ${voidReason}`,
    sourceType: "VOID_REVERSAL",
    sourceId: original.id,
    reference: `REVERSES:${original.entry_number}`,
    createdBy: actorUserId,
    lines: reversalLines,
  });

  // Mark original as voided
  const voidedAt = new Date().toISOString();
  await client
    .from("journal_entries")
    .update({
      status: "voided",
      voided_at: voidedAt,
      void_reason: voidReason,
      reversal_entry_id: reversalEntry.id,
    })
    .eq("id", original.id);

  // Record Audit
  try {
    await client.from("accounting_audit_logs").insert({
      business_id: businessId,
      actor_user_id: actorUserId || null,
      action: "JOURNAL_VOIDED",
      entity: "journal_entries",
      entity_id: original.id,
      metadata: {
        originalEntryNumber: original.entry_number,
        reversalEntryId: reversalEntry.id,
        voidReason,
      },
    });
  } catch {
    // Non-blocking
  }

  const updatedOriginal = mapRowToJournalEntry({
    ...original,
    status: "voided",
    voided_at: voidedAt,
    void_reason: voidReason,
    reversal_entry_id: reversalEntry.id,
  });

  return { original: updatedOriginal, reversal: reversalEntry };
}

function mapRowToJournalEntry(row: Record<string, unknown>): JournalEntry {
  const rawLines = Array.isArray(row.journal_lines) ? row.journal_lines : [];
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    entryNumber: String(row.entry_number),
    journalDate: String(row.journal_date),
    description: String(row.description),
    sourceType: row.source_type as JournalSourceType,
    sourceId: row.source_id ? String(row.source_id) : null,
    status: row.status as JournalEntry["status"],
    reference: row.reference ? String(row.reference) : null,
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: String(row.created_at),
    postedAt: String(row.posted_at),
    voidedAt: row.voided_at ? String(row.voided_at) : null,
    voidReason: row.void_reason ? String(row.void_reason) : null,
    reversalEntryId: row.reversal_entry_id ? String(row.reversal_entry_id) : null,
    lines: rawLines.map((l: Record<string, unknown>) => ({
      id: String(l.id),
      journalEntryId: String(l.journal_entry_id),
      accountId: String(l.account_id),
      debit: Number(l.debit) || 0,
      credit: Number(l.credit) || 0,
      description: l.description ? String(l.description) : null,
      lineOrder: Number(l.line_order) || 0,
    })),
  };
}
