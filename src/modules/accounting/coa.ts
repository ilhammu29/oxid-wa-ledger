import { SupabaseClient } from "@supabase/supabase-js";
import { ChartOfAccount, AccountType, NormalBalance } from "./types";

export const STANDARD_ACCOUNTS = {
  KAS: "1100",
  BANK: "1200",
  PIUTANG_USAHA: "1300",
  PERSEDIAAN: "1400",
  ASET_TETAP: "1500",
  AKUM_PENYUSUTAN: "1590",
  HUTANG_USAHA: "2100",
  HUTANG_BANK: "2200",
  MODAL_PEMILIK: "3100",
  PRIVE_PEMILIK: "3200",
  LABA_DITAHAN: "3300",
  PENDAPATAN_PENJUALAN: "4100",
  PENDAPATAN_LAIN: "4200",
  HPP: "5100",
  BEBAN_OPERASIONAL: "6100",
  BEBAN_GAJI: "6200",
  BEBAN_SEWA: "6300",
  BEBAN_PENYUSUTAN: "6400",
  BEBAN_LAIN: "6900",
} as const;

export const DEFAULT_COA_DEFINITIONS: Array<{
  code: string;
  name: string;
  type: AccountType;
  normal_balance: NormalBalance;
}> = [
  { code: "1000", name: "Aset", type: "ASSET", normal_balance: "DEBIT" },
  { code: "1100", name: "Kas", type: "ASSET", normal_balance: "DEBIT" },
  { code: "1200", name: "Bank", type: "ASSET", normal_balance: "DEBIT" },
  { code: "1300", name: "Piutang Usaha", type: "ASSET", normal_balance: "DEBIT" },
  { code: "1400", name: "Persediaan Barang", type: "ASSET", normal_balance: "DEBIT" },
  { code: "1500", name: "Aset Tetap", type: "ASSET", normal_balance: "DEBIT" },
  { code: "1590", name: "Akumulasi Penyusutan", type: "ASSET", normal_balance: "CREDIT" },
  { code: "2000", name: "Kewajiban", type: "LIABILITY", normal_balance: "CREDIT" },
  { code: "2100", name: "Hutang Usaha", type: "LIABILITY", normal_balance: "CREDIT" },
  { code: "2200", name: "Hutang Bank / Pinjaman", type: "LIABILITY", normal_balance: "CREDIT" },
  { code: "3000", name: "Ekuitas", type: "EQUITY", normal_balance: "CREDIT" },
  { code: "3100", name: "Modal Pemilik", type: "EQUITY", normal_balance: "CREDIT" },
  { code: "3200", name: "Prive Pemilik", type: "EQUITY", normal_balance: "DEBIT" },
  { code: "3300", name: "Laba Ditahan / Saldo Laba", type: "EQUITY", normal_balance: "CREDIT" },
  { code: "4000", name: "Pendapatan", type: "REVENUE", normal_balance: "CREDIT" },
  { code: "4100", name: "Pendapatan Penjualan", type: "REVENUE", normal_balance: "CREDIT" },
  { code: "4200", name: "Pendapatan Lain-lain", type: "REVENUE", normal_balance: "CREDIT" },
  { code: "5000", name: "Harga Pokok Penjualan", type: "COGS", normal_balance: "DEBIT" },
  { code: "5100", name: "Beban Pokok Penjualan (HPP)", type: "COGS", normal_balance: "DEBIT" },
  { code: "6000", name: "Beban Operasional", type: "EXPENSE", normal_balance: "DEBIT" },
  { code: "6100", name: "Beban Operasional Umum", type: "EXPENSE", normal_balance: "DEBIT" },
  { code: "6200", name: "Beban Gaji & Upah", type: "EXPENSE", normal_balance: "DEBIT" },
  { code: "6300", name: "Beban Sewa Tempat", type: "EXPENSE", normal_balance: "DEBIT" },
  { code: "6400", name: "Beban Penyusutan Aset", type: "EXPENSE", normal_balance: "DEBIT" },
  { code: "6900", name: "Beban Lain-lain", type: "EXPENSE", normal_balance: "DEBIT" },
];

/**
 * Ensures that the business has its authoritative Chart of Accounts seeded.
 */
export async function ensureBusinessChartOfAccounts(
  client: SupabaseClient,
  businessId: string
): Promise<ChartOfAccount[]> {
  // 1. Check existing accounts
  const { data: existing, error: fetchErr } = await client
    .from("chart_of_accounts")
    .select("*")
    .eq("business_id", businessId)
    .order("code", { ascending: true });

  if (!fetchErr && existing && existing.length >= 10) {
    return existing.map(mapRowToCOA);
  }

  // 2. Invoke RPC or seed if fewer than standard accounts
  try {
    await client.rpc("seed_default_chart_of_accounts", {
      p_business_id: businessId,
    });
  } catch {
    // If RPC unavailable or already run, continue
  }

  // Refetch
  const { data: refetched } = await client
    .from("chart_of_accounts")
    .select("*")
    .eq("business_id", businessId)
    .order("code", { ascending: true });

  return (refetched || []).map(mapRowToCOA);
}

/**
 * Retrieves a single COA account by business and code (e.g. '1100', '4100').
 */
export async function getAccountByCode(
  client: SupabaseClient,
  businessId: string,
  code: string
): Promise<ChartOfAccount | null> {
  const { data, error } = await client
    .from("chart_of_accounts")
    .select("*")
    .eq("business_id", businessId)
    .eq("code", code)
    .maybeSingle();

  if (error || !data) {
    // Fallback: seed and retry once if not found
    await ensureBusinessChartOfAccounts(client, businessId);
    const { data: retryData } = await client
      .from("chart_of_accounts")
      .select("*")
      .eq("business_id", businessId)
      .eq("code", code)
      .maybeSingle();
    return retryData ? mapRowToCOA(retryData) : null;
  }

  return mapRowToCOA(data);
}

/**
 * Retrieves a Map of all accounts for a business keyed by code.
 */
export async function getAccountsMapByCode(
  client: SupabaseClient,
  businessId: string
): Promise<Map<string, ChartOfAccount>> {
  const accounts = await ensureBusinessChartOfAccounts(client, businessId);
  const map = new Map<string, ChartOfAccount>();
  for (const acc of accounts) {
    map.set(acc.code, acc);
  }
  return map;
}

function mapRowToCOA(row: Record<string, unknown>): ChartOfAccount {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    code: String(row.code),
    name: String(row.name),
    type: row.type as ChartOfAccount["type"],
    normalBalance: row.normal_balance as ChartOfAccount["normalBalance"],
    parentId: row.parent_id ? String(row.parent_id) : null,
    isSystem: Boolean(row.is_system),
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
