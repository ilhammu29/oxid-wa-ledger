import { SupabaseClient } from "@supabase/supabase-js";
import { getAccountsMapByCode } from "./coa";
import { postJournalEntry, voidJournalEntry } from "./journal";
import { CreateJournalLineInput } from "./journal";

/**
 * Posts financial impact of a Sale transaction to double-entry general ledger.
 */
export async function postSaleToAccounting(
  client: SupabaseClient,
  params: {
    businessId: string;
    transactionId: string;
    totalAmount: number;
    unitCost?: number;
    quantity: number;
    isCredit?: boolean;
    customerName?: string | null;
    counterpartyId?: string | null;
    transactionDate?: string;
    description?: string;
    actorUserId?: string | null;
  }
): Promise<void> {
  const {
    businessId,
    transactionId,
    totalAmount,
    unitCost = 0,
    quantity,
    isCredit = false,
    customerName,
    counterpartyId,
    transactionDate = new Date().toISOString().slice(0, 10),
    description = "Penjualan",
    actorUserId,
  } = params;

  if (totalAmount <= 0) return;

  const accountsMap = await getAccountsMapByCode(client, businessId);

  const kasAccount = accountsMap.get("1100");
  const piutangAccount = accountsMap.get("1300");
  const salesRevenueAccount = accountsMap.get("4100");
  const cogsAccount = accountsMap.get("5100");
  const inventoryAccount = accountsMap.get("1400");

  if (!salesRevenueAccount) {
    throw new Error("Akun Pendapatan Penjualan (4100) tidak ditemukan di Chart of Accounts.");
  }

  const lines: CreateJournalLineInput[] = [];

  // Line 1: Debit Liquid Cash or Receivable
  if (isCredit) {
    if (!piutangAccount) throw new Error("Akun Piutang Usaha (1300) tidak ditemukan.");
    lines.push({
      accountId: piutangAccount.id,
      debit: totalAmount,
      credit: 0,
      description: `Piutang Penjualan ${customerName ? `ke ${customerName}` : ""}`,
    });

    // Create Receivable record
    try {
      await client.from("receivables").insert({
        business_id: businessId,
        customer_id: counterpartyId || null,
        customer_name: customerName || "Pelanggan",
        source_transaction_id: transactionId,
        total_amount: totalAmount,
        paid_amount: 0,
        status: "unpaid",
      });
    } catch {
      // Non-blocking if already created
    }
  } else {
    if (!kasAccount) throw new Error("Akun Kas (1100) tidak ditemukan.");
    lines.push({
      accountId: kasAccount.id,
      debit: totalAmount,
      credit: 0,
      description: "Kas Penjualan",
    });
  }

  // Line 2: Credit Sales Revenue
  lines.push({
    accountId: salesRevenueAccount.id,
    debit: 0,
    credit: totalAmount,
    description: description || "Pendapatan Penjualan",
  });

  // Lines 3 & 4: COGS & Inventory (if product has cost)
  const cogsAmount = Math.round(quantity * (unitCost || 0));
  if (cogsAmount > 0 && cogsAccount && inventoryAccount) {
    lines.push({
      accountId: cogsAccount.id,
      debit: cogsAmount,
      credit: 0,
      description: "Harga Pokok Penjualan (HPP)",
    });
    lines.push({
      accountId: inventoryAccount.id,
      debit: 0,
      credit: cogsAmount,
      description: "Pengurangan Persediaan Penjualan",
    });

    // Record inventory deduction
    try {
      // Fetch product_id from transaction
      const { data: tx } = await client
        .from("transactions")
        .select("product_id")
        .eq("id", transactionId)
        .maybeSingle();

      if (tx?.product_id) {
        await client.from("inventory_movements").insert({
          business_id: businessId,
          product_id: tx.product_id,
          quantity: -Math.abs(quantity), // Negative for outbound
          unit_cost: unitCost,
          total_cost: cogsAmount,
          movement_type: "sale",
          reference_type: "transaction",
          reference_id: transactionId,
        });
      }
    } catch {
      // Continue
    }
  }

  // Post Journal
  await postJournalEntry(client, {
    businessId,
    journalDate: transactionDate,
    description: `${description}: ${totalAmount.toLocaleString()}`,
    sourceType: "SALE",
    sourceId: transactionId,
    reference: `TX:${transactionId.slice(0, 8)}`,
    createdBy: actorUserId,
    lines,
  });
}

/**
 * Posts an Expense transaction to double-entry general ledger.
 */
export async function postExpenseToAccounting(
  client: SupabaseClient,
  params: {
    businessId: string;
    category: string;
    amount: number;
    description: string;
    expenseDate?: string;
    paymentAccountCode?: "1100" | "1200";
    source?: string;
    actorUserId?: string | null;
  }
): Promise<{ expenseId: string; journalEntryId: string }> {
  const {
    businessId,
    category,
    amount,
    description,
    expenseDate = new Date().toISOString().slice(0, 10),
    paymentAccountCode = "1100",
    source = "telegram",
    actorUserId,
  } = params;

  if (amount <= 0) throw new Error("Nominal pengeluaran harus lebih besar dari 0.");

  const accountsMap = await getAccountsMapByCode(client, businessId);

  // Map category to COA Expense Account Code
  const catLower = category.toLowerCase();
  let expenseCode = "6900"; // Default: Beban Operasional Lainnya

  if (catLower.includes("gaji") || catLower.includes("karyawan") || catLower.includes("upah")) {
    expenseCode = "6100";
  } else if (catLower.includes("listrik") || catLower.includes("air") || catLower.includes("pln") || catLower.includes("pdam")) {
    expenseCode = "6200";
  } else if (catLower.includes("internet") || catLower.includes("pulsa") || catLower.includes("kuota") || catLower.includes("wifi")) {
    expenseCode = "6300";
  } else if (catLower.includes("sewa") || catLower.includes("kontrak")) {
    expenseCode = "6400";
  } else if (catLower.includes("transport") || catLower.includes("bensin") || catLower.includes("solar") || catLower.includes("bbm") || catLower.includes("ongkir")) {
    expenseCode = "6500";
  } else if (catLower.includes("marketing") || catLower.includes("iklan") || catLower.includes("promo") || catLower.includes("ads")) {
    expenseCode = "6600";
  } else if (catLower.includes("atk") || catLower.includes("admin") || catLower.includes("tulis") || catLower.includes("kertas")) {
    expenseCode = "6700";
  }

  const expenseAccount = accountsMap.get(expenseCode) || accountsMap.get("6900") || accountsMap.get("6000");
  const paymentAccount = accountsMap.get(paymentAccountCode) || accountsMap.get("1100");

  if (!expenseAccount || !paymentAccount) {
    throw new Error("Akun beban atau akun pembayaran tidak ditemukan di Chart of Accounts.");
  }

  // Insert into expenses table
  const { data: expData, error: expErr } = await client
    .from("expenses")
    .insert({
      business_id: businessId,
      category,
      expense_account_id: expenseAccount.id,
      payment_account_id: paymentAccount.id,
      amount,
      description,
      expense_date: expenseDate,
      status: "confirmed",
      source,
      created_by_user_id: actorUserId || null,
    })
    .select()
    .single();

  if (expErr || !expData) {
    throw new Error(`Gagal mencatat pengeluaran: ${expErr?.message || "Unknown"}`);
  }

  const expenseId = String(expData.id);

  // Post Journal: Debit Expense, Credit Cash/Bank
  const journal = await postJournalEntry(client, {
    businessId,
    journalDate: expenseDate,
    description: `Beban ${expenseAccount.name}: ${description}`,
    sourceType: "EXPENSE",
    sourceId: expenseId,
    reference: `EXP:${expenseId.slice(0, 8)}`,
    createdBy: actorUserId,
    lines: [
      {
        accountId: expenseAccount.id,
        debit: amount,
        credit: 0,
        description: `Beban: ${description}`,
      },
      {
        accountId: paymentAccount.id,
        debit: 0,
        credit: amount,
        description: `Pembayaran dari ${paymentAccount.name}`,
      },
    ],
  });

  return { expenseId, journalEntryId: journal.id };
}

/**
 * Posts Owner Capital Contribution or Owner Draw (Prive).
 */
export async function postCapitalMovementToAccounting(
  client: SupabaseClient,
  params: {
    businessId: string;
    type: "CAPITAL_IN" | "OWNER_DRAW";
    amount: number;
    description: string;
    movementDate?: string;
    accountCode?: "1100" | "1200";
    source?: string;
    actorUserId?: string | null;
  }
): Promise<{ movementId: string; journalEntryId: string }> {
  const {
    businessId,
    type,
    amount,
    description,
    movementDate = new Date().toISOString().slice(0, 10),
    accountCode = "1100",
    source = "telegram",
    actorUserId,
  } = params;

  if (amount <= 0) throw new Error("Nominal modal harus lebih besar dari 0.");

  const accountsMap = await getAccountsMapByCode(client, businessId);

  const kasAccount = accountsMap.get(accountCode) || accountsMap.get("1100");
  const ownerCapitalAccount = accountsMap.get("3100");
  const ownerDrawAccount = accountsMap.get("3200");

  if (!kasAccount || !ownerCapitalAccount || !ownerDrawAccount) {
    throw new Error("Akun ekuitas/kas tidak ditemukan di Chart of Accounts.");
  }

  const targetAccount = type === "CAPITAL_IN" ? ownerCapitalAccount : ownerDrawAccount;

  // Insert into capital_movements
  const { data: capData, error: capErr } = await client
    .from("capital_movements")
    .insert({
      business_id: businessId,
      type,
      account_id: targetAccount.id,
      amount,
      description,
      movement_date: movementDate,
      status: "confirmed",
      source,
      created_by_user_id: actorUserId || null,
    })
    .select()
    .single();

  if (capErr || !capData) {
    throw new Error(`Gagal mencatat modal: ${capErr?.message || "Unknown"}`);
  }

  const movementId = String(capData.id);

  let lines: CreateJournalLineInput[];

  if (type === "CAPITAL_IN") {
    // Debit Kas, Credit Modal Pemilik
    lines = [
      {
        accountId: kasAccount.id,
        debit: amount,
        credit: 0,
        description: `Setoran Modal Kas: ${description}`,
      },
      {
        accountId: ownerCapitalAccount.id,
        debit: 0,
        credit: amount,
        description: `Modal Pemilik: ${description}`,
      },
    ];
  } else {
    // Debit Prive Pemilik (Equity Debit), Credit Kas
    lines = [
      {
        accountId: ownerDrawAccount.id,
        debit: amount,
        credit: 0,
        description: `Prive Pemilik: ${description}`,
      },
      {
        accountId: kasAccount.id,
        debit: 0,
        credit: amount,
        description: `Penarikan dari Kas: ${description}`,
      },
    ];
  }

  const journal = await postJournalEntry(client, {
    businessId,
    journalDate: movementDate,
    description: `${type === "CAPITAL_IN" ? "Setoran Modal" : "Prive Pemilik"}: ${description}`,
    sourceType: type,
    sourceId: movementId,
    reference: `CAP:${movementId.slice(0, 8)}`,
    createdBy: actorUserId,
    lines,
  });

  return { movementId, journalEntryId: journal.id };
}

/**
 * Posts Inventory Purchase (Cash or Credit).
 */
export async function postPurchaseToAccounting(
  client: SupabaseClient,
  params: {
    businessId: string;
    productId?: string | null;
    supplierName?: string | null;
    supplierId?: string | null;
    quantity: number;
    unit?: string;
    unitCost: number;
    totalAmount: number;
    paymentMethod?: "cash" | "bank" | "credit";
    purchaseDate?: string;
    source?: string;
    actorUserId?: string | null;
  }
): Promise<{ purchaseId: string; journalEntryId: string }> {
  const {
    businessId,
    productId,
    supplierName,
    supplierId,
    quantity,
    unit = "kg",
    unitCost,
    totalAmount,
    paymentMethod = "cash",
    purchaseDate = new Date().toISOString().slice(0, 10),
    source = "telegram",
    actorUserId,
  } = params;

  if (totalAmount <= 0) throw new Error("Total pembelian harus lebih besar dari 0.");

  const accountsMap = await getAccountsMapByCode(client, businessId);

  const inventoryAccount = accountsMap.get("1400");
  const kasAccount = accountsMap.get("1100");
  const bankAccount = accountsMap.get("1200");
  const apAccount = accountsMap.get("2100");

  if (!inventoryAccount) {
    throw new Error("Akun Persediaan Barang (1400) tidak ditemukan.");
  }

  // Insert into purchases table
  const { data: purData, error: purErr } = await client
    .from("purchases")
    .insert({
      business_id: businessId,
      product_id: productId || null,
      supplier_name: supplierName || null,
      supplier_id: supplierId || null,
      quantity,
      unit,
      unit_cost: unitCost,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      status: "confirmed",
      purchase_date: purchaseDate,
      source,
    })
    .select()
    .single();

  if (purErr || !purData) {
    throw new Error(`Gagal mencatat pembelian: ${purErr?.message || "Unknown"}`);
  }

  const purchaseId = String(purData.id);

  // Record Inventory Movement (Stock IN)
  if (productId) {
    try {
      await client.from("inventory_movements").insert({
        business_id: businessId,
        product_id: productId,
        quantity: Math.abs(quantity), // Positive for IN
        unit_cost: unitCost,
        total_cost: totalAmount,
        movement_type: "purchase",
        reference_type: "purchase",
        reference_id: purchaseId,
      });

      // Update product unit_cost if available
      await client
        .from("products")
        .update({ unit_cost: unitCost })
        .eq("id", productId)
        .eq("business_id", businessId);
    } catch {
      // Continue
    }
  }

  // Construct Journal Lines
  const lines: CreateJournalLineInput[] = [
    {
      accountId: inventoryAccount.id,
      debit: totalAmount,
      credit: 0,
      description: `Pembelian Persediaan: ${quantity} ${unit}`,
    },
  ];

  if (paymentMethod === "credit") {
    if (!apAccount) throw new Error("Akun Hutang Usaha (2100) tidak ditemukan.");
    lines.push({
      accountId: apAccount.id,
      debit: 0,
      credit: totalAmount,
      description: `Hutang Pembelian ${supplierName ? `ke ${supplierName}` : ""}`,
    });

    // Create Payable record
    await client.from("payables").insert({
      business_id: businessId,
      supplier_id: supplierId || null,
      supplier_name: supplierName || "Supplier",
      purchase_id: purchaseId,
      total_amount: totalAmount,
      paid_amount: 0,
      status: "unpaid",
    });
  } else if (paymentMethod === "bank") {
    if (!bankAccount) throw new Error("Akun Bank (1200) tidak ditemukan.");
    lines.push({
      accountId: bankAccount.id,
      debit: 0,
      credit: totalAmount,
      description: "Pembayaran Transfer Bank",
    });
  } else {
    if (!kasAccount) throw new Error("Akun Kas (1100) tidak ditemukan.");
    lines.push({
      accountId: kasAccount.id,
      debit: 0,
      credit: totalAmount,
      description: "Pembayaran Tunai Kas",
    });
  }

  const journal = await postJournalEntry(client, {
    businessId,
    journalDate: purchaseDate,
    description: `Pembelian Persediaan ${quantity} ${unit}: ${totalAmount.toLocaleString()}`,
    sourceType: "PURCHASE",
    sourceId: purchaseId,
    reference: `PUR:${purchaseId.slice(0, 8)}`,
    createdBy: actorUserId,
    lines,
  });

  return { purchaseId, journalEntryId: journal.id };
}

/**
 * Posts Customer Debt Repayment (Payment received for Accounts Receivable).
 */
export async function postReceivablePaymentToAccounting(
  client: SupabaseClient,
  params: {
    businessId: string;
    receivableId: string;
    amount: number;
    paymentDate?: string;
    paymentAccountCode?: "1100" | "1200";
    actorUserId?: string | null;
  }
): Promise<{ paymentId: string; journalEntryId: string }> {
  const {
    businessId,
    receivableId,
    amount,
    paymentDate = new Date().toISOString().slice(0, 10),
    paymentAccountCode = "1100",
    actorUserId,
  } = params;

  if (amount <= 0) throw new Error("Nominal pelunasan piutang harus lebih besar dari 0.");

  const { data: recv, error: recvErr } = await client
    .from("receivables")
    .select("*")
    .eq("id", receivableId)
    .eq("business_id", businessId)
    .single();

  if (recvErr || !recv) throw new Error("Data piutang tidak ditemukan.");

  const newPaid = Number(recv.paid_amount) + amount;
  const newStatus = newPaid >= Number(recv.total_amount) ? "paid" : "partially_paid";

  const accountsMap = await getAccountsMapByCode(client, businessId);
  const kasAccount = accountsMap.get(paymentAccountCode) || accountsMap.get("1100");
  const piutangAccount = accountsMap.get("1300");

  if (!kasAccount || !piutangAccount) throw new Error("Akun kas/piutang tidak ditemukan.");

  // Record payment in receivable_payments
  const { data: payData, error: payErr } = await client
    .from("receivable_payments")
    .insert({
      business_id: businessId,
      receivable_id: receivableId,
      payment_account_id: kasAccount.id,
      amount,
      payment_date: paymentDate,
      status: "confirmed",
    })
    .select()
    .single();

  if (payErr || !payData) throw new Error(`Gagal mencatat pembayaran piutang: ${payErr?.message}`);

  // Update receivable status
  await client
    .from("receivables")
    .update({ paid_amount: newPaid, status: newStatus })
    .eq("id", receivableId);

  const paymentId = String(payData.id);

  // Journal: Debit Kas, Credit Piutang Usaha
  const journal = await postJournalEntry(client, {
    businessId,
    journalDate: paymentDate,
    description: `Penerimaan Piutang dari ${recv.customer_name}: Rp ${amount.toLocaleString()}`,
    sourceType: "PAYMENT_RECEIVABLE",
    sourceId: paymentId,
    reference: `RECV-PAY:${paymentId.slice(0, 8)}`,
    createdBy: actorUserId,
    lines: [
      {
        accountId: kasAccount.id,
        debit: amount,
        credit: 0,
        description: `Penerimaan Kas dari ${recv.customer_name}`,
      },
      {
        accountId: piutangAccount.id,
        debit: 0,
        credit: amount,
        description: `Pengurangan Piutang ${recv.customer_name}`,
      },
    ],
  });

  return { paymentId, journalEntryId: journal.id };
}

/**
 * Posts Supplier Debt Payment (Payment made for Accounts Payable).
 */
export async function postPayablePaymentToAccounting(
  client: SupabaseClient,
  params: {
    businessId: string;
    payableId: string;
    amount: number;
    paymentDate?: string;
    paymentAccountCode?: "1100" | "1200";
    actorUserId?: string | null;
  }
): Promise<{ paymentId: string; journalEntryId: string }> {
  const {
    businessId,
    payableId,
    amount,
    paymentDate = new Date().toISOString().slice(0, 10),
    paymentAccountCode = "1100",
    actorUserId,
  } = params;

  if (amount <= 0) throw new Error("Nominal pembayaran hutang harus lebih besar dari 0.");

  const { data: payb, error: paybErr } = await client
    .from("payables")
    .select("*")
    .eq("id", payableId)
    .eq("business_id", businessId)
    .single();

  if (paybErr || !payb) throw new Error("Data hutang tidak ditemukan.");

  const newPaid = Number(payb.paid_amount) + amount;
  const newStatus = newPaid >= Number(payb.total_amount) ? "paid" : "partially_paid";

  const accountsMap = await getAccountsMapByCode(client, businessId);
  const kasAccount = accountsMap.get(paymentAccountCode) || accountsMap.get("1100");
  const apAccount = accountsMap.get("2100");

  if (!kasAccount || !apAccount) throw new Error("Akun kas/hutang tidak ditemukan.");

  // Record in payable_payments
  const { data: payData, error: payErr } = await client
    .from("payable_payments")
    .insert({
      business_id: businessId,
      payable_id: payableId,
      payment_account_id: kasAccount.id,
      amount,
      payment_date: paymentDate,
      status: "confirmed",
    })
    .select()
    .single();

  if (payErr || !payData) throw new Error(`Gagal mencatat pembayaran hutang: ${payErr?.message}`);

  // Update payable record
  await client
    .from("payables")
    .update({ paid_amount: newPaid, status: newStatus })
    .eq("id", payableId);

  const paymentId = String(payData.id);

  // Journal: Debit Hutang Usaha, Credit Kas
  const journal = await postJournalEntry(client, {
    businessId,
    journalDate: paymentDate,
    description: `Pembayaran Hutang ke ${payb.supplier_name}: Rp ${amount.toLocaleString()}`,
    sourceType: "PAYMENT_PAYABLE",
    sourceId: paymentId,
    reference: `AP-PAY:${paymentId.slice(0, 8)}`,
    createdBy: actorUserId,
    lines: [
      {
        accountId: apAccount.id,
        debit: amount,
        credit: 0,
        description: `Pelunasan Hutang ke ${payb.supplier_name}`,
      },
      {
        accountId: kasAccount.id,
        debit: 0,
        credit: amount,
        description: `Pembayaran dari ${kasAccount.name}`,
      },
    ],
  });

  return { paymentId, journalEntryId: journal.id };
}

/**
 * Voids a Sale transaction from the accounting engine.
 * Generates exact reversing entries and undoes inventory deductions.
 */
export async function voidSaleFromAccounting(
  client: SupabaseClient,
  params: {
    businessId: string;
    transactionId: string;
    voidReason: string;
    actorUserId?: string | null;
  }
): Promise<void> {
  const { businessId, transactionId, voidReason, actorUserId } = params;

  // 1. Void Journal Entry (swaps debit and credit)
  try {
    await voidJournalEntry(client, {
      businessId,
      sourceType: "SALE",
      sourceId: transactionId,
      voidReason,
      actorUserId,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[voidSaleFromAccounting] Journal void warning: ${msg}`);
  }

  // 2. Reverse Inventory Movement
  try {
    const { data: movements } = await client
      .from("inventory_movements")
      .select("*")
      .eq("business_id", businessId)
      .eq("reference_type", "transaction")
      .eq("reference_id", transactionId);

    if (movements && movements.length > 0) {
      for (const m of movements) {
        // Create compensatory return movement
        await client.from("inventory_movements").insert({
          business_id: businessId,
          product_id: m.product_id,
          quantity: Math.abs(Number(m.quantity)), // Return stock
          unit_cost: m.unit_cost,
          total_cost: m.total_cost,
          movement_type: "sale_void",
          reference_type: "transaction_void",
          reference_id: transactionId,
        });
      }
    }
  } catch {
    // Continue
  }

  // 3. Void Receivable if created
  try {
    await client
      .from("receivables")
      .update({ status: "voided" })
      .eq("business_id", businessId)
      .eq("source_transaction_id", transactionId);
  } catch {
    // Continue
  }
}
