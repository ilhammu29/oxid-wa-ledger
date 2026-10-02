"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { requestPasswordResetAction } from "@/app/signup/actions";
import { SignIn } from "@/components/ui/sign-in";

function LoginFormContainer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotStatus, setForgotStatus] = useState<string | null>(null);

  const queryError = searchParams.get("error");
  const queryReset = searchParams.get("reset");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (
          msg.includes("invalid login credentials") ||
          error.code === "invalid_credentials"
        ) {
          setErrorMessage("Email atau kata sandi tidak sesuai. Silakan coba lagi.");
        } else if (
          msg.includes("email not confirmed") ||
          error.code === "email_not_confirmed"
        ) {
          setErrorMessage(
            "Email belum diverifikasi. Silakan periksa kotak masuk atau spam email Anda."
          );
        } else if (msg.includes("rate limit") || error.status === 429) {
          setErrorMessage("Terlalu banyak percobaan masuk. Silakan tunggu beberapa saat.");
        } else {
          setErrorMessage(
            "Gagal masuk. Silakan periksa kembali email dan kata sandi Anda."
          );
        }
        return;
      }

      if (data.user) {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setErrorMessage("Terjadi kendala saat memproses login. Silakan coba sesaat lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotStatus(null);
    setForgotLoading(true);

    try {
      const res = await requestPasswordResetAction(forgotEmail || email);
      if (res.success) {
        setForgotStatus(
          "Tautan reset kata sandi telah dikirim ke email Anda. Silakan periksa kotak masuk atau spam."
        );
      } else {
        setForgotStatus(res.error || "Gagal memproses permintaan reset kata sandi.");
      }
    } catch {
      setForgotStatus("Terjadi kendala koneksi server.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <SignIn
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      loading={loading}
      onSubmit={handleSubmit}
      errorMessage={errorMessage}
      queryError={queryError}
      queryReset={queryReset}
      showForgot={showForgot}
      setShowForgot={setShowForgot}
      forgotEmail={forgotEmail}
      setForgotEmail={setForgotEmail}
      forgotLoading={forgotLoading}
      forgotStatus={forgotStatus}
      onForgotPassword={handleForgotPassword}
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] flex items-center justify-center bg-background text-foreground">
          <div className="h-8 w-8 rounded-xl bg-primary animate-pulse" />
        </div>
      }
    >
      <LoginFormContainer />
    </Suspense>
  );
}
