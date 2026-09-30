import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { getOverviewKPIs, getDailySalesSeries } from "@/modules/transactions";
import { generateLedgerWorkbook } from "@/modules/export/excel-generator";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Authenticate user & resolve tenant strictly via membership
    // Do NOT trust any query parameters for authorization!
    let session;
    try {
      session = await getAuthenticatedBusiness({ redirectToLogin: false });
    } catch {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Sesi login tidak valid. Silakan masuk terlebih dahulu." },
        { status: 401 }
      );
    }

    if (session.status !== "OK" || !session.business) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Anda tidak memiliki akses ke bisnis ini." },
        { status: 403 }
      );
    }

    const business = session.business;
    const supabase = await createClient();

    // 2. Fetch business products
    const { data: productsData, error: prodErr } = await supabase
      .from("products")
      .select("id, name, unit, default_price, active, is_default")
      .eq("business_id", business.id)
      .order("created_at", { ascending: true });

    if (prodErr) {
      throw prodErr;
    }

    const productMap = new Map<string, string>();
    (productsData || []).forEach((p) => {
      productMap.set(p.id, p.name);
    });

    // 3. Fetch transactions (newest first)
    const { data: txData, error: txErr } = await supabase
      .from("transactions")
      .select("id, product_id, transaction_at, source, quantity, unit, unit_price, total_amount, status, raw_message")
      .eq("business_id", business.id)
      .order("transaction_at", { ascending: false });

    if (txErr) {
      throw txErr;
    }

    const formattedTransactions = (txData || []).map((t) => ({
      id: t.id,
      transaction_at: t.transaction_at,
      source: t.source,
      product_name: t.product_id ? productMap.get(t.product_id) || "Produk" : "Produk Default",
      quantity: Number(t.quantity),
      unit: t.unit,
      unit_price: Number(t.unit_price),
      total_amount: Number(t.total_amount),
      status: t.status,
      raw_message: t.raw_message,
    }));

    // 4. Fetch daily statuses
    const { data: statusData, error: statusErr } = await supabase
      .from("business_daily_status")
      .select("local_date, status, source, note")
      .eq("business_id", business.id)
      .order("local_date", { ascending: false });

    if (statusErr) {
      throw statusErr;
    }

    // 5. Fetch KPIs and daily sales series
    const overviewKPIs = await getOverviewKPIs(supabase, business.id);
    const dailySeries = await getDailySalesSeries(supabase, business.id, 14);

    // 6. Generate multi-sheet XLSX buffer
    const xlsxBuffer = await generateLedgerWorkbook({
      business,
      overviewKPIs,
      dailySeries,
      transactions: formattedTransactions,
      products: (productsData || []).map((p) => ({
        id: p.id,
        name: p.name,
        unit: p.unit,
        default_price: Number(p.default_price),
        active: Boolean(p.active),
        is_default: Boolean(p.is_default),
      })),
      dailyStatuses: (statusData || []).map((s) => ({
        local_date: String(s.local_date),
        status: s.status,
        source: s.source,
        note: s.note,
      })),
    });

    const safeBusinessName = business.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const todayStr = new Date().toISOString().slice(0, 10);
    const filename = `oxid-ledger-${safeBusinessName}-${todayStr}.xlsx`;

    return new NextResponse(new Uint8Array(xlsxBuffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[SpreadsheetExport] Error exporting ledger:", msg);
    return NextResponse.json(
      { error: "EXPORT_FAILED", message: "Gagal membuat berkas spreadsheet laporan." },
      { status: 500 }
    );
  }
}
