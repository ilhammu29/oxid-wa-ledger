import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { generateAccountingExcelWorkbook } from "@/modules/export/accounting-excel";
import { getBusinessTimezone } from "@/modules/transactions/service";
import { getMonthUtcRange } from "@/modules/transactions/timezone";
import { getBusinessSubscriptionState, hasPlanFeature } from "@/modules/subscriptions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
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

    // Authoritative Feature Entitlement Check
    const subState = await getBusinessSubscriptionState(supabase, business.id);
    if (!hasPlanFeature(subState.plan.code, "accounting_excel")) {
      return NextResponse.json(
        {
          error: "PLAN_UPGRADE_REQUIRED",
          message: "Export Excel 14-sheet komprehensif adalah fitur eksklusif Paket Pro. Silakan upgrade paket langganan Anda di menu Langganan.",
        },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    let startDate = searchParams.get("startDate");
    let endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      const timezone = await getBusinessTimezone(supabase, business.id);
      const range = getMonthUtcRange(new Date(), timezone);
      startDate = range.startAt.toISOString().slice(0, 10);
      endDate = range.endAt.toISOString().slice(0, 10);
    }

    const buffer = await generateAccountingExcelWorkbook(supabase, {
      businessId: business.id,
      startDate,
      endDate,
    });

    const yearMonth = startDate.slice(0, 7);
    const filename = `OXID_Ledger_Laporan_${business.name.replace(/[^a-zA-Z0-9]/g, "_")}_${yearMonth}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ExportAccountingExcel] Error generating workbook:", msg);
    return NextResponse.json(
      { error: "EXPORT_FAILED", message: "Gagal membuat berkas Excel laporan akuntansi." },
      { status: 500 }
    );
  }
}
