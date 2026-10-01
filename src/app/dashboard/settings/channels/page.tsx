import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import {
  getBusinessChannelSettings,
  checkWhatsAppReadiness,
} from "@/modules/channels";
import { ChannelsView } from "@/components/dashboard/channels-view";

export const dynamic = "force-dynamic";

export default async function ChannelsSettingsPage() {
  const session = await getAuthenticatedBusiness();
  const business = session.business!;
  const supabase = await createClient();

  const [channelSettings, whatsappReadiness, sendersRes, telegramOpsRes] = await Promise.all([
    getBusinessChannelSettings(supabase, business.id),
    checkWhatsAppReadiness(supabase, business.id),
    supabase
      .from("whatsapp_authorized_senders")
      .select("id, phone_number, display_label, active, receive_reminders, created_at")
      .eq("business_id", business.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("telegram_authorized_users")
      .select("id, telegram_user_id, display_label, active, created_at")
      .eq("business_id", business.id)
      .eq("active", true)
      .order("created_at", { ascending: true }),
  ]);

  const senders = (sendersRes.data || []).map((s) => ({
    id: s.id,
    phoneNumber: s.phone_number,
    displayLabel: s.display_label,
    active: s.active,
    receiveReminders: s.receive_reminders ?? false,
    createdAt: s.created_at,
  }));

  const telegramOperators = (telegramOpsRes.data || []).map((t) => ({
    id: t.id,
    telegramUserId: Number(t.telegram_user_id),
    displayLabel: t.display_label,
    active: t.active,
    createdAt: t.created_at,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
          Kanal Komunikasi & Pesan
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
          Kelola kanal bot aktif, kesiapan WhatsApp Cloud API, dan perutean pengingat otomatis.
        </p>
      </div>

      <ChannelsView
        settings={{
          telegramEnabled: channelSettings.telegramEnabled,
          whatsappEnabled: channelSettings.whatsappEnabled,
          primaryChannel: channelSettings.primaryChannel,
          reminderChannel: channelSettings.reminderChannel,
        }}
        readiness={whatsappReadiness}
        senders={senders}
        telegramOperators={telegramOperators}
        role={session.role || "member"}
      />
    </div>
  );
}
