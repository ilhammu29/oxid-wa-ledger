import "server-only";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { validateInviteToken } from "@/modules/onboarding/invite";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { ClientOnboardingView } from "@/components/onboarding/client-onboarding-view";
import { getBusinessOnboardingState } from "@/modules/onboarding/client-launch";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface OnboardingPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const resolvedParams = await searchParams;
  const rawToken = resolvedParams?.token;
  const token = typeof rawToken === "string" ? rawToken : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is not logged in
  if (!user) {
    redirect("/signup");
  }

  // 1. Support legacy invite token if explicitly provided in query params
  if (token) {
    const validation = await validateInviteToken(supabase, token, user.email);

    if (!validation.valid) {
      let errorTitle = "Undangan Tidak Valid";
      let errorMessage = "Tautan undangan tidak ditemukan atau sudah tidak aktif.";

      if (validation.reason === "EXPIRED") {
        errorTitle = "Undangan Kedaluwarsa";
        errorMessage = "Batas waktu berlaku tautan aktivasi ini telah habis.";
      } else if (validation.reason === "ALREADY_USED") {
        errorTitle = "Undangan Sudah Digunakan";
        errorMessage = "Tautan undangan ini telah selesai digunakan.";
      } else if (validation.reason === "EMAIL_MISMATCH") {
        errorTitle = "Email Tidak Sesuai";
        errorMessage = `Anda sedang login sebagai ${user.email}, sedangkan undangan ini ditujukan untuk ${validation.email}.`;
      }

      return (
        <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-4">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center shadow-2xl">
            <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-zinc-100 mb-2">{errorTitle}</h2>
            <p className="text-xs text-zinc-400 leading-relaxed mb-6">{errorMessage}</p>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold transition-colors"
            >
              Lanjut ke Onboarding Mandiri
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <OnboardingWizard
          inviteToken={token}
          invitedEmail={validation.email!}
          initialUserEmail={user.email}
        />
      </div>
    );
  }

  // 2. Standard Client Self-Serve Onboarding Journey
  // Check if user already owns or belongs to a business
  const { data: memberships } = await supabase
    .from("business_users")
    .select(`
      business_id,
      role,
      businesses (
        id,
        name,
        category,
        owner_name,
        timezone,
        default_unit,
        status,
        onboarding_completed_at
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1);

  const primaryMembership = memberships?.[0];
  const rawBusiness = primaryMembership?.businesses as unknown as {
    id: string;
    name: string;
    category?: string | null;
    owner_name?: string | null;
    timezone?: string;
    default_unit?: string;
    status: string;
    onboarding_completed_at?: string | null;
  } | null;

  let initialProgress = null;

  if (rawBusiness) {
    initialProgress = await getBusinessOnboardingState(supabase, rawBusiness.id);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      <header className="border-b border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs shadow-xs">
              OX
            </div>
            <span className="font-bold text-zinc-100 tracking-tight text-sm">OXID Ledger</span>
          </Link>
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <span className="hidden sm:inline">{user.email}</span>
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center">
        <ClientOnboardingView
          initialBusiness={
            rawBusiness
              ? {
                  id: rawBusiness.id,
                  name: rawBusiness.name,
                  category: rawBusiness.category,
                  ownerName: rawBusiness.owner_name,
                  timezone: rawBusiness.timezone,
                  defaultUnit: rawBusiness.default_unit,
                }
              : null
          }
          initialProgress={initialProgress}
          userEmail={user.email || ""}
        />
      </main>

      <footer className="py-6 text-center text-xs text-zinc-600 border-t border-zinc-800/60">
        OXID Ledger Onboarding • Bantuan & Pertanyaan Hubungi Tim Dukungan
      </footer>
    </div>
  );
}
