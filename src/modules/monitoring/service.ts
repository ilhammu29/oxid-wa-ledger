import { SupabaseClient } from "@supabase/supabase-js";
import { getConversationFailures, ConversationFailure } from "../pilot-hardening";

export type ChannelStatus = "ACTIVE" | "DISABLED" | "NOT READY" | "WARNING" | "ERROR";

export interface MonitoringData {
  channels: {
    telegram: {
      status: ChannelStatus;
      enabled: boolean;
      detail: string;
      lastInbound: string | null;
      lastOutbound: string | null;
    };
    whatsapp: {
      status: ChannelStatus;
      enabled: boolean;
      detail: string;
      lastInbound: string | null;
      lastOutbound: string | null;
    };
  };
  googleSheets: {
    status: "CONNECTED" | "DISABLED" | "ERROR" | "NOT CONFIGURED";
    enabled: boolean;
    spreadsheetTitle: string | null;
    lastSyncAt: string | null;
    pendingSync: boolean;
    lastErrorCode: string | null;
    lastErrorMessage: string | null;
  };
  lastActivity: {
    lastInbound: string | null;
    lastOutbound: string | null;
    lastSuccessfulCommand: string | null;
  };
  scheduler: {
    lastRun: string | null;
    lastSuccess: string | null;
    businessesChecked: number;
    notificationsSent: number;
    notificationsFailed: number;
    status: string | null;
  };
  recentErrors: Array<{
    id: string;
    channel: string;
    direction: string;
    eventType: string;
    status: string;
    errorCode: string | null;
    metadata: Record<string, unknown>;
    createdAt: string;
  }>;
  pendingFailures: ConversationFailure[];
}

/**
 * Computes deterministic channel health status without AI.
 */
export async function getMonitoringData(
  client: SupabaseClient,
  businessId: string
): Promise<MonitoringData> {
  // 1. Channel Settings
  const { data: channelSettings } = await client
    .from("business_channel_settings")
    .select("*")
    .eq("business_id", businessId)
    .single();

  const telegramEnabled = channelSettings?.telegram_enabled ?? true;
  const whatsappEnabled = channelSettings?.whatsapp_enabled ?? false;

  // 2. WhatsApp Connections & Readiness check
  const { data: waConnections } = await client
    .from("whatsapp_connections")
    .select("id, status, phone_number_id")
    .eq("business_id", businessId)
    .in("status", ["active", "connected"]);

  const { data: waSenders } = await client
    .from("whatsapp_authorized_senders")
    .select("id")
    .eq("business_id", businessId)
    .eq("active", true);

  const isWaReady =
    Boolean(waConnections && waConnections.length > 0 && waConnections[0].phone_number_id) &&
    Boolean(waSenders && waSenders.length > 0);

  // 3. Integration Events in last 24h
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentEvents } = await client
    .from("integration_events")
    .select("*")
    .eq("business_id", businessId)
    .gte("created_at", oneDayAgo)
    .order("created_at", { ascending: false })
    .limit(100);

  const events = recentEvents || [];

  // Telegram health calculation
  let telegramStatus: ChannelStatus = "ACTIVE";
  let telegramDetail = "Siap menerima dan mengirim pesan";
  if (!telegramEnabled) {
    telegramStatus = "DISABLED";
    telegramDetail = "Channel dinonaktifkan di pengaturan";
  } else {
    const recentTgErrors = events.filter(
      (e) => e.channel === "telegram" && e.status === "failed"
    );
    if (recentTgErrors.length >= 3) {
      telegramStatus = "ERROR";
      telegramDetail = `${recentTgErrors.length} kegagalan terdeteksi dalam 24 jam`;
    } else if (recentTgErrors.length > 0) {
      telegramStatus = "WARNING";
      telegramDetail = `Ada ${recentTgErrors.length} peringatan/kesalahan baru-baru ini`;
    }
  }

  // WhatsApp health calculation
  let whatsappStatus: ChannelStatus = "NOT READY";
  let whatsappDetail = "Koneksi WhatsApp belum dikonfigurasi lengkap";
  if (!whatsappEnabled) {
    whatsappStatus = "DISABLED";
    whatsappDetail = "Channel dinonaktifkan di pengaturan";
  } else if (!isWaReady) {
    whatsappStatus = "NOT READY";
    whatsappDetail = "Phone Number ID atau operator WhatsApp belum terhubung";
  } else {
    const recentWaErrors = events.filter(
      (e) => e.channel === "whatsapp" && e.status === "failed"
    );
    if (recentWaErrors.length >= 3) {
      whatsappStatus = "ERROR";
      whatsappDetail = `${recentWaErrors.length} kegagalan terdeteksi dalam 24 jam`;
    } else if (recentWaErrors.length > 0) {
      whatsappStatus = "WARNING";
      whatsappDetail = `Ada ${recentWaErrors.length} peringatan pengiriman`;
    } else {
      whatsappStatus = "ACTIVE";
      whatsappDetail = "Koneksi WhatsApp aktif dan terhubung";
    }
  }

  // Find last activities
  const tgInbound = events.find((e) => e.channel === "telegram" && e.direction === "inbound");
  const tgOutbound = events.find((e) => e.channel === "telegram" && e.direction === "outbound");
  const waInbound = events.find((e) => e.channel === "whatsapp" && e.direction === "inbound");
  const waOutbound = events.find((e) => e.channel === "whatsapp" && e.direction === "outbound");

  const lastInboundEvent = events.find((e) => e.direction === "inbound");
  const lastOutboundEvent = events.find((e) => e.direction === "outbound");
  const lastSuccessCommand = events.find(
    (e) => (e.eventType === "telegram.inbound.processed" || e.eventType === "whatsapp.inbound.processed") && e.status === "success"
  );

  // 4. Scheduler Job Runs
  const { data: jobRuns } = await client
    .from("system_job_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  const lastRun = jobRuns && jobRuns.length > 0 ? jobRuns[0] : null;
  const lastSuccessRun = jobRuns?.find((j) => j.status === "completed") || null;

  // 5. Recent 20 Errors
  const { data: recentErrorsData } = await client
    .from("integration_events")
    .select("id, channel, direction, event_type, status, error_code, metadata, created_at")
    .eq("business_id", businessId)
    .in("status", ["failed", "warning"])
    .order("created_at", { ascending: false })
    .limit(20);

  // 6. Pending Conversation Failures
  const pendingFailures = await getConversationFailures(client, businessId, {
    reviewStatus: "pending",
    limit: 20,
  });

  // 7. Google Sheets Connection & Queue Status
  const { data: sheetsConn } = await client
    .from("google_sheets_connections")
    .select("enabled, spreadsheet_id, spreadsheet_title, last_sync_at, last_sync_status, last_error_code, last_error_message")
    .eq("business_id", businessId)
    .maybeSingle();

  const { data: pendingSheetsJobs } = await client
    .from("google_sheets_sync_queue")
    .select("id")
    .eq("business_id", businessId)
    .in("status", ["pending", "processing"])
    .limit(1);

  const hasPendingSheetsSync = Boolean(pendingSheetsJobs && pendingSheetsJobs.length > 0);

  let sheetsStatus: "CONNECTED" | "DISABLED" | "ERROR" | "NOT CONFIGURED" = "NOT CONFIGURED";
  if (!sheetsConn || !sheetsConn.spreadsheet_id) {
    sheetsStatus = "NOT CONFIGURED";
  } else if (!sheetsConn.enabled) {
    sheetsStatus = "DISABLED";
  } else if (sheetsConn.last_sync_status === "failed") {
    sheetsStatus = "ERROR";
  } else {
    sheetsStatus = "CONNECTED";
  }

  return {
    channels: {
      telegram: {
        status: telegramStatus,
        enabled: telegramEnabled,
        detail: telegramDetail,
        lastInbound: tgInbound?.created_at || null,
        lastOutbound: tgOutbound?.created_at || null,
      },
      whatsapp: {
        status: whatsappStatus,
        enabled: whatsappEnabled,
        detail: whatsappDetail,
        lastInbound: waInbound?.created_at || null,
        lastOutbound: waOutbound?.created_at || null,
      },
    },
    googleSheets: {
      status: sheetsStatus,
      enabled: Boolean(sheetsConn?.enabled),
      spreadsheetTitle: sheetsConn?.spreadsheet_title || null,
      lastSyncAt: sheetsConn?.last_sync_at || null,
      pendingSync: hasPendingSheetsSync,
      lastErrorCode: sheetsConn?.last_error_code || null,
      lastErrorMessage: sheetsConn?.last_error_message || null,
    },
    lastActivity: {
      lastInbound: lastInboundEvent?.created_at || null,
      lastOutbound: lastOutboundEvent?.created_at || null,
      lastSuccessfulCommand: lastSuccessCommand?.created_at || null,
    },
    scheduler: {
      lastRun: lastRun?.started_at || null,
      lastSuccess: lastSuccessRun?.finished_at || null,
      businessesChecked: lastRun?.businesses_checked || 0,
      notificationsSent: lastRun?.notifications_sent || 0,
      notificationsFailed: lastRun?.notifications_failed || 0,
      status: lastRun?.status || null,
    },
    recentErrors: (recentErrorsData || []).map((e: {
      id: string;
      channel: string;
      direction: string;
      event_type: string;
      status: string;
      error_code: string | null;
      metadata: unknown;
      created_at: string;
    }) => ({
      id: e.id,
      channel: e.channel,
      direction: e.direction,
      eventType: e.event_type,
      status: e.status,
      errorCode: e.error_code,
      metadata: (e.metadata as Record<string, unknown>) || {},
      createdAt: e.created_at,
    })),
    pendingFailures,
  };
}
