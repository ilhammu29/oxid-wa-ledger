import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { ExpensesClientView, ExpenseRow } from "@/components/dashboard/expenses-client-view";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const session = await getAuthenticatedBusiness();
  const business = session.business!;
  const supabase = await createClient();

  const { data: expenses } = await supabase
    .from("expenses")
    .select("id, expense_date, category, description, amount, payment_account, status, created_at")
    .eq("business_id", business.id)
    .order("expense_date", { ascending: false });

  const rows: ExpenseRow[] = (expenses || []).map((e) => ({
    id: e.id,
    expense_date: e.expense_date,
    category: e.category,
    description: e.description,
    amount: Number(e.amount) || 0,
    payment_account: e.payment_account,
    status: e.status || "active",
    created_at: e.created_at,
  }));

  return <ExpensesClientView expenses={rows} timezone={business.timezone || "Asia/Jakarta"} />;
}
