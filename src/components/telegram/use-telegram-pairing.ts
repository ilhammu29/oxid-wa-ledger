"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TelegramPairingTokenResult } from "@/modules/onboarding/types";
import { getTelegramBotUsername, buildTelegramPairingDeepLink } from "@/config/env.client";

export type PairingState = "GENERATING" | "ACTIVE" | "EXPIRED" | "CONSUMED" | "ERROR";

export interface UseTelegramPairingOptions {
  generateToken: () => Promise<{
    success: boolean;
    result?: TelegramPairingTokenResult;
    data?: TelegramPairingTokenResult;
    error?: string;
  }>;
  checkStatus: (tokenCode: string) => Promise<{
    success: boolean;
    paired: boolean;
    operatorLabel?: string;
    error?: string;
  }>;
  onSuccess?: (details?: { operatorLabel?: string }) => void;
  autoStart?: boolean;
}

export function useTelegramPairing({
  generateToken,
  checkStatus,
  onSuccess,
  autoStart = true,
}: UseTelegramPairingOptions) {
  const [state, setState] = useState<PairingState>("GENERATING");
  const [tokenResult, setTokenResult] = useState<TelegramPairingTokenResult | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(600);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Clear running timers safely
  const clearTimers = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Generate new pairing code
  const handleGenerate = useCallback(async () => {
    clearTimers();
    setState("GENERATING");
    setErrorMessage(null);
    setCopied(false);

    try {
      const res = await generateToken();
      if (!isMountedRef.current) return;

      const tokenData = res.result || res.data;

      if (res.success && tokenData) {
        setTokenResult(tokenData);

        const expiresAt = new Date(tokenData.expiresAt).getTime();
        const now = Date.now();
        const diffSecs = Math.max(0, Math.floor((expiresAt - now) / 1000));
        setSecondsRemaining(diffSecs > 0 ? diffSecs : tokenData.expiresInSeconds || 600);

        setState("ACTIVE");
      } else {
        setState("ERROR");
        setErrorMessage(res.error || "Gagal membuat kode koneksi. Silakan coba lagi.");
      }
    } catch {
      if (isMountedRef.current) {
        setState("ERROR");
        setErrorMessage("Gagal membuat kode koneksi. Silakan coba lagi.");
      }
    }
  }, [clearTimers, generateToken]);

  // Initial trigger
  useEffect(() => {
    isMountedRef.current = true;
    if (autoStart) {
      let isCancelled = false;
      generateToken()
        .then((res) => {
          if (isCancelled || !isMountedRef.current) return;
          const tokenData = res.result || res.data;
          if (res.success && tokenData) {
            setTokenResult(tokenData);
            const expiresAt = new Date(tokenData.expiresAt).getTime();
            const now = Date.now();
            const diffSecs = Math.max(0, Math.floor((expiresAt - now) / 1000));
            setSecondsRemaining(diffSecs > 0 ? diffSecs : tokenData.expiresInSeconds || 600);
            setState("ACTIVE");
          } else {
            setState("ERROR");
            setErrorMessage(res.error || "Gagal membuat kode koneksi. Silakan coba lagi.");
          }
        })
        .catch(() => {
          if (!isCancelled && isMountedRef.current) {
            setState("ERROR");
            setErrorMessage("Gagal membuat kode koneksi. Silakan coba lagi.");
          }
        });

      return () => {
        isCancelled = true;
        isMountedRef.current = false;
        clearTimers();
      };
    }
    return () => {
      isMountedRef.current = false;
      clearTimers();
    };
  }, [autoStart, generateToken, clearTimers]);

  // Countdown timer for ACTIVE state
  useEffect(() => {
    if (state !== "ACTIVE") return;

    countdownTimerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearTimers();
          setState("EXPIRED");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [state, clearTimers]);

  // Polling for pairing status every 2.5s using zero-plaintext pairingId
  useEffect(() => {
    if (state !== "ACTIVE") return;
    const identifierToPoll = tokenResult?.pairingId || tokenResult?.code;
    if (!identifierToPoll) return;

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const res = await checkStatus(identifierToPoll);
        if (!isMountedRef.current) return;

        if (res.paired) {
          clearTimers();
          setState("CONSUMED");
          if (onSuccess) {
            onSuccess({ operatorLabel: res.operatorLabel });
          }
        }
      } catch {
        // Soft error during polling; continue next tick
      }
    }, 2500);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [state, tokenResult?.pairingId, tokenResult?.code, checkStatus, clearTimers, onSuccess]);

  const copyCode = useCallback(() => {
    if (!tokenResult?.code) return;
    navigator.clipboard.writeText(`/connect ${tokenResult.code}`);
    setCopied(true);
    setTimeout(() => {
      if (isMountedRef.current) setCopied(false);
    }, 2000);
  }, [tokenResult]);

  // Derived values
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedCountdown = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const botUsername = tokenResult?.botUsername || getTelegramBotUsername();
  const pairingCode = tokenResult?.code || "";
  const deepLink =
    tokenResult?.deepLink || buildTelegramPairingDeepLink(pairingCode, botUsername);

  return {
    state,
    tokenResult,
    pairingCode,
    botUsername,
    deepLink,
    secondsRemaining,
    formattedCountdown,
    copied,
    errorMessage,
    generateNewCode: handleGenerate,
    copyCode,
  };
}
