import { NextResponse } from "next/server";
import { checkServerEnv } from "@/config/env";
import { createClient as createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Health check endpoint verifying that the Next.js server runtime
 * can reach the configured Supabase project.
 * 
 * SECURITY: Never exposes actual keys, credentials, or connection strings.
 */
export async function GET() {
  const envCheck = checkServerEnv();

  const result: {
    status: "healthy" | "unhealthy";
    timestamp: string;
    environment: {
      supabaseUrl: "configured" | "missing";
      supabaseAnonKey: "configured" | "missing";
      supabaseServiceRoleKey: "configured" | "missing";
      whatsappAccessToken: "configured" | "missing";
      whatsappPhoneNumberId: "configured" | "missing";
      whatsappWabaId: "configured" | "missing";
      metaAppSecret: "configured" | "missing";
      whatsappVerifyToken: "configured" | "missing";
      telegramBotToken: "configured" | "missing";
      telegramWebhookSecret: "configured" | "missing";
    };
    supabaseConnectivity: {
      reachable: boolean;
      statusText: string;
    };
  } = {
    status: "unhealthy",
    timestamp: new Date().toISOString(),
    environment: {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "configured" : "missing",
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "configured" : "missing",
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? "configured" : "missing",
      whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN ? "configured" : "missing",
      whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ? "configured" : "missing",
      whatsappWabaId: process.env.WHATSAPP_WABA_ID ? "configured" : "missing",
      metaAppSecret: process.env.META_APP_SECRET ? "configured" : "missing",
      whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN ? "configured" : "missing",
      telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ? "configured" : "missing",
      telegramWebhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET ? "configured" : "missing",
    },
    supabaseConnectivity: {
      reachable: false,
      statusText: "untested",
    },
  };

  if (!envCheck.isValid) {
    return NextResponse.json(
      {
        ...result,
        message: "Environment variables missing on server runtime",
      },
      { status: 503 }
    );
  }

  try {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.getSession();

    if (error) {
      result.supabaseConnectivity = {
        reachable: false,
        statusText: error.message,
      };
      return NextResponse.json(result, { status: 502 });
    }

    result.status = "healthy";
    result.supabaseConnectivity = {
      reachable: true,
      statusText: "connected",
    };

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown connection error";
    result.supabaseConnectivity = {
      reachable: false,
      statusText: errorMessage,
    };
    return NextResponse.json(result, { status: 500 });
  }
}
