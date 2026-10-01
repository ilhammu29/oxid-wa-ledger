import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { RemindersView } from "@/components/dashboard/reminders-view";

export const dynamic = "force-dynamic";

export default async function RemindersSettingsPage() {
  const session = await getAuthenticatedBusiness();
  const business = session.business!;
  const supabase = await createClient();

  // 1. Fetch business reminder settings
  const { data: reminderSettings } = await supabase
    .from("business_reminder_settings")
    .select("enabled, reminder_time, days_of_week, channel, timezone")
    .eq("business_id", business.id)
    .maybeSingle();

  // 2. Fetch active telegram operators
  const { data: operatorsData } = await supabase
    .from("telegram_authorized_users")
    .select("id, telegram_user_id, display_label, receive_reminders")
    .eq("business_id", business.id)
    .eq("active", true)
    .order("created_at", { ascending: true });

  const settings = {
    enabled: reminderSettings?.enabled ?? false,
    reminderTime: reminderSettings?.reminder_time ?? "20:00",
    daysOfWeek: (reminderSettings?.days_of_week as number[]) ?? [1, 2, 3, 4, 5, 6],
    channel: reminderSettings?.channel ?? "telegram",
    timezone: reminderSettings?.timezone ?? business.timezone ?? "Asia/Jakarta",
  };

  const operators = (operatorsData || []).map((o) => ({
    id: o.id,
    telegramUserId: Number(o.telegram_user_id),
    displayLabel: o.display_label,
    receiveReminders: Boolean(o.receive_reminders),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          Pengaturan Pengingat Harian
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Konfigurasi otomatisasi pengingat penutupan buku kas harian via Telegram.
        </p>
      </div>

      <RemindersView
        settings={settings}
        operators={operators}
        role={session.role || "member"}
      />
    </div>
  );
}
