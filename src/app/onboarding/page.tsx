import "server-only";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { validateInviteToken } from "@/modules/onboarding/invite";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { ClientOnboardingView } from "@/components/onboarding/client-onboarding-view";
import { getBusinessOnboardingState } from "@/modules/onboarding/client-launch";
import { ThemeToggle } from "@/components/landing/theme-toggle";
import { AlertCircle, Mail, ArrowRight } from "lucide-react";
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

  // Email verification enforcement (Step 10.2)
  if (
    process.env.ALLOW_UNVERIFIED_INTERNAL_SIGNUP !== "true" &&
    !user.email_confirmed_at &&
    !user.confirmed_at
  ) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center p-4 font-sans selection:bg-primary/20 selection:text-primary">
        <div className="max-w-md w-full bg-surface border border-border rounded-2xl p-8 text-center shadow-xs">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center mb-4">
            <Mail className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Verifikasi Email Diperlukan</h2>
          <p className="text-xs text-muted leading-relaxed mb-6">
            Akun Anda (<strong>{user.email}</strong>) belum diverifikasi. Silakan periksa kotak masuk atau spam email Anda dan klik tautan konfirmasi sebelum memulai onboarding.
          </p>
          <div className="space-y-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full h-[46px] rounded-xl bg-primary hover:bg-primary-hover text-primary-fg text-xs font-semibold transition-colors shadow-xs"
            >
              Kembali ke Halaman Masuk
            </Link>
          </div>
        </div>
      </div>
    );
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
        <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center p-4 selection:bg-primary/20 selection:text-primary">
          <div className="max-w-md w-full bg-surface border border-border rounded-2xl p-8 text-center shadow-xs">
            <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 mx-auto flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">{errorTitle}</h2>
            <p className="text-xs text-muted leading-relaxed mb-6">{errorMessage}</p>
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center gap-2 w-full h-[46px] rounded-xl bg-primary hover:bg-primary-hover text-primary-fg text-xs font-semibold transition-colors shadow-xs"
            >
              <span>Lanjut ke Onboarding Mandiri</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-primary/20 selection:text-primary">
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
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20 selection:text-primary transition-colors">
      <header className="border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group cursor-pointer">
            <div className="h-9 w-9 rounded-xl bg-primary text-primary-fg flex items-center justify-center font-bold text-xs shadow-xs transition-transform group-hover:scale-105">
              OX
            </div>
            <div>
              <span className="font-bold text-foreground tracking-tight text-sm block leading-tight">
                OXID Ledger
              </span>
              <span className="text-[11px] text-muted block leading-none mt-0.5">
                Aktivasi Usaha Baru
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-3 text-xs">
            <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-lg bg-surface-hover border border-border text-xs text-muted font-mono">
              {user.email}
            </span>
            {rawBusiness?.onboarding_completed_at && (
              <Link
                href="/dashboard"
                className="text-xs font-semibold text-primary hover:underline px-2 py-1"
              >
                Ke Dashboard &rarr;
              </Link>
            )}
            <ThemeToggle showLabel={false} />
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-start py-6 sm:py-10">
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

      <footer className="py-6 text-center text-xs text-muted border-t border-border bg-surface/40">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} OXID Ledger. Seluruh hak cipta dilindungi.</span>
          <span className="text-[11px] text-muted-fg">Butuh bantuan pengaturan? Hubungi tim panduan OXID.</span>
        </div>
      </footer>
    </div>
  );
}
