/**
 * Centralized Authoritative Subscription Plans & Pricing Metadata.
 * Step 9.1: Hardened subscription tiers with integer IDR money semantics.
 * Note: These pricing tiers serve as system defaults and can be configured as needed.
 */
import { SubscriptionPlan, SubscriptionPlanCode } from "./types";

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanCode, SubscriptionPlan> = {
  pilot: {
    code: "pilot",
    name: "Paket Pilot (Uji Coba)",
    description: "Akses penuh gratis selama masa uji coba 14 hari.",
    priceIdr: 0,
    durationDays: 14,
    features: [
      "Pencatatan penjualan via Telegram & WhatsApp",
      "Sinkronisasi Google Sheets otomatis",
      "Pengingat harian otomatis",
      "Laporan penjualan harian, mingguan, & bulanan",
      "Multi-produk & pengenalan alias cerdas",
    ],
  },
  basic: {
    code: "basic",
    name: "Paket Usaha Mikro (Basic)",
    description: "Solusi pembukuan praktis harian untuk UMKM & pedagang.",
    priceIdr: 49000,
    durationDays: 30,
    features: [
      "Pencatatan transaksi tak terbatas",
      "Hingga 5 produk & alias aktif",
      "Pengingat tutup buku Telegram",
      "Sinkronisasi 1 Google Spreadsheet",
      "Dashboard performa & status harian",
    ],
  },
  pro: {
    code: "pro",
    name: "Paket Usaha Berkembang (Pro)",
    description: "Fitur lengkap dengan prioritas sinkronisasi dan dukungan kanal.",
    priceIdr: 149000,
    durationDays: 30,
    features: [
      "Semua fitur Paket Basic",
      "Produk & alias tak terbatas",
      "Dukungan multi-operator Telegram & WhatsApp",
      "Sinkronisasi Google Sheets prioritas",
      "Audit trail & export Excel tak terbatas",
      "Bantuan teknis prioritas",
    ],
  },
};

export function getPlan(code: string | null | undefined): SubscriptionPlan {
  if (code && code in SUBSCRIPTION_PLANS) {
    return SUBSCRIPTION_PLANS[code as SubscriptionPlanCode];
  }
  return SUBSCRIPTION_PLANS.pilot;
}

/**
 * Returns a plan strictly matching the given code, or null if invalid/not found.
 * Prevents silent fallback assumptions.
 */
export function getPlanByCode(code: string | null | undefined): SubscriptionPlan | null {
  if (code && code in SUBSCRIPTION_PLANS) {
    return SUBSCRIPTION_PLANS[code as SubscriptionPlanCode];
  }
  return null;
}

export function getAllPlans(): SubscriptionPlan[] {
  return Object.values(SUBSCRIPTION_PLANS);
}

export function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
