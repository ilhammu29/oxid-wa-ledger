import "server-only";

import { createClient } from "@/lib/supabase/server";
import { validateInviteToken } from "@/modules/onboarding";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { AlertCircle, HelpCircle } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface OnboardingPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const resolvedParams = await searchParams;
  const rawToken = resolvedParams?.token;
  const token = typeof rawToken === "string" ? rawToken : null;

  if (!token) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center shadow-2xl">
          <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-zinc-100 mb-2">
            Tautan Pendaftaran Tidak Valid
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed mb-6">
            Halaman aktivasi klien memerlukan token undangan resmi yang disertakan pada tautan undangan pendaftaran Anda.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
          >
            Kembali ke Login
          </Link>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const validation = await validateInviteToken(supabase, token, user?.email);

  if (!validation.valid) {
    let errorTitle = "Undangan Tidak Valid";
    let errorMessage = "Tautan undangan tidak ditemukan atau sudah tidak aktif.";

    if (validation.reason === "EXPIRED") {
      errorTitle = "Undangan Kedaluwarsa";
      errorMessage = "Batas waktu berlaku tautan aktivasi ini telah habis. Silakan hubungi admin untuk mendapatkan undangan baru.";
    } else if (validation.reason === "ALREADY_USED") {
      errorTitle = "Undangan Sudah Digunakan";
      errorMessage = "Tautan undangan ini telah selesai digunakan untuk mengaktifkan bisnis sebelumnya.";
    } else if (validation.reason === "EMAIL_MISMATCH") {
      errorTitle = "Email Tidak Sesuai";
      errorMessage = `Anda sedang login sebagai ${user?.email}, sedangkan undangan ini ditujukan untuk ${validation.email}. Silakan logout terlebih dahulu.`;
    }

    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center shadow-2xl">
          <div className="h-12 w-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-zinc-100 mb-2">{errorTitle}</h2>
          <p className="text-xs text-zinc-400 leading-relaxed mb-6">
            {errorMessage}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
            >
              Masuk ke Akun
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-emerald-500/20 selection:text-emerald-900">
      <OnboardingWizard
        inviteToken={token}
        invitedEmail={validation.email!}
        initialUserEmail={user?.email}
      />
    </div>
  );
}
