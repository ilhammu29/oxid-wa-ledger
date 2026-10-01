"use client";

import { Bot, X } from "lucide-react";
import { getTelegramBotUsername } from "@/config/env.client";
import { TelegramPairingTokenResult } from "@/modules/onboarding/types";
import { TelegramPairingCard } from "./telegram-pairing-card";

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
  if (!isOpen) return null;

  const botUsername = getTelegramBotUsername();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full sm:max-w-md bg-[#111726] rounded-t-3xl sm:rounded-2xl border border-white/10 shadow-2xl p-6 space-y-4 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto text-white"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20 shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Hubungkan Telegram</h2>
              <p className="text-[11px] text-zinc-400">@{botUsername}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 flex items-center justify-center transition-colors min-h-[36px]"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reusable Pairing Card Content */}
        <TelegramPairingCard
          theme="dark"
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
