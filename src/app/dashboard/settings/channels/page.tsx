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

  const [channelSettings, whatsappReadiness] = await Promise.all([
    getBusinessChannelSettings(supabase, business.id),
    checkWhatsAppReadiness(supabase, business.id),
  ]);

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
        role={session.role || "member"}
      />
    </div>
  );
}
