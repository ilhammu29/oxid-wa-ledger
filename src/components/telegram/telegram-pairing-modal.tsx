"use client";

import { Bot, X } from "lucide-react";
import { getTelegramBotUsername } from "@/config/env.client";
import { TelegramPairingTokenResult } from "@/modules/onboarding/types";
import { TelegramPairingCard } from "./telegram-pairing-card";
import { useTheme } from "@/components/theme/theme-provider";

export interface TelegramPairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  generateToken: () => Promise<{
    success: boolean;
    result?: TelegramPairingTokenResult;
    data?: TelegramPairingTokenResult;
    error?: string;
  }>;
  checkStatus: (tokenCode: string) => Promise<{
    success: boolean;
    paired: boolean;
    error?: string;
  }>;
}

export function TelegramPairingModal({
  isOpen,
  onClose,
  onSuccess,
  generateToken,
  checkStatus,
}: TelegramPairingModalProps) {
  const { resolvedTheme } = useTheme();

  if (!isOpen) return null;

  const botUsername = getTelegramBotUsername();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full sm:max-w-md card-base bg-surface rounded-t-2xl sm:rounded-xl border border-border shadow-xl p-5 space-y-4 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto text-foreground"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Hubungkan Telegram</h2>
              <p className="text-xs text-muted font-mono">@{botUsername}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-md text-muted hover:text-foreground hover:bg-secondary flex items-center justify-center transition-colors"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reusable Pairing Card Content */}
        <TelegramPairingCard
          theme={resolvedTheme === "light" ? "light" : "dark"}
          generateToken={generateToken}
          checkStatus={checkStatus}
          onSuccess={() => {
            if (onSuccess) onSuccess();
            // Automatically close modal after brief visual confirmation
            setTimeout(() => {
              onClose();
            }, 1800);
          }}
          onCancel={onClose}
          showCancelButton={false}
        />
      </div>
    </div>
  );
}
