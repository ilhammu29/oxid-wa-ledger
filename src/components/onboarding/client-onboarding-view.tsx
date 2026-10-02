"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Package,
  Bot,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  Scale,
  Coins,
  MessageSquare,
  Copy,
  Check,
} from "lucide-react";
import {
  createBusinessAction,
  addFirstProductAction,
  generatePairingTokenAction,
  checkTelegramStatusAction,
  checkFirstTransactionAction,
  skipGoogleSheetsAction,
} from "@/app/onboarding/actions";
import { BusinessOnboardingProgress } from "@/modules/onboarding/types";
import { formatIDR } from "@/modules/subscriptions/plans";
import { TelegramPairingCard } from "@/components/telegram/telegram-pairing-card";
import { useTheme } from "@/components/theme/theme-provider";

interface ClientOnboardingViewProps {
  initialBusiness: {
    id: string;
    name: string;
    category?: string | null;
    ownerName?: string | null;
    timezone?: string;
    defaultUnit?: string;
  } | null;
  initialProgress: BusinessOnboardingProgress | null;
  userEmail?: string;
}

export function ClientOnboardingView({
  initialBusiness,
  initialProgress,
}: ClientOnboardingViewProps) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();

  // Wizard state
  const [business, setBusiness] = useState(initialBusiness);
  const [currentStep, setCurrentStep] = useState<number>(
    initialBusiness ? initialProgress?.currentStep || 2 : 1
  );
  const [progress] = useState<BusinessOnboardingProgress | null>(initialProgress);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step 1: Business Form
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("Perikanan");
  const [ownerName, setOwnerName] = useState("");
  const [timezone, setTimezone] = useState("Asia/Pontianak");
  const [defaultUnit, setDefaultUnit] = useState("kg");

  // Step 2: First Product Form
  const [productName, setProductName] = useState(
    category === "Perikanan" ? "Lele" : "Produk Utama"
  );
  const [unit, setUnit] = useState("kg");
  const [priceIdr, setPriceIdr] = useState("28000");
  const [aliases, setAliases] = useState("lele, ikan lele");

  // Step 3: Telegram Pairing State
  const [telegramConnected, setTelegramConnected] = useState(
    Boolean(initialProgress?.telegramCompleted)
  );
  const [operatorLabel, setOperatorLabel] = useState<string>("");

  // Step 4: First Transaction State
  const [firstTxRecorded, setFirstTxRecorded] = useState(
    Boolean(initialProgress?.firstTransactionCompleted)
  );
  const [txDetails, setTxDetails] = useState<{
    productName: string;
    quantity: number;
    unit: string;
    totalAmountIdr: number;
  } | null>(null);
  const [copiedExample, setCopiedExample] = useState(false);

  // Calculate percentage
  const getPercentage = () => {
    if (!business) return 0;
    let p = 20;
    if (currentStep > 2 || progress?.productCompleted) p += 20;
    if (currentStep > 3 || progress?.telegramCompleted || telegramConnected) p += 20;
    if (currentStep > 4 || progress?.firstTransactionCompleted || firstTxRecorded) p += 20;
    if (currentStep >= 6 || progress?.completedAt) p += 20;
    return Math.min(100, p);
  };

  // --------------------------------------------------------------------------
  // Step 1: Create Business
  // --------------------------------------------------------------------------
  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const fd = new FormData();
      fd.set("businessName", businessName);
      fd.set("category", category);
      fd.set("ownerName", ownerName);
      fd.set("timezone", timezone);
      fd.set("defaultUnit", defaultUnit);

      const res = await createBusinessAction(fd);
      if (!res.success || !res.businessId) {
        setErrorMsg(res.error || "Gagal membuat profil bisnis.");
        return;
      }

      setBusiness({
        id: res.businessId,
        name: businessName,
        category,
        ownerName,
        timezone,
        defaultUnit,
      });

      setCurrentStep(2);
    } catch {
      setErrorMsg("Terjadi kesalahan sistem saat membuat profil usaha.");
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Step 2: Add First Product
  // --------------------------------------------------------------------------
  const handleAddFirstProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    setErrorMsg(null);
    setLoading(true);

    try {
      const fd = new FormData();
      fd.set("businessId", business.id);
      fd.set("productName", productName);
      fd.set("unit", unit);
      fd.set("priceIdr", priceIdr);
      fd.set("aliases", aliases);

      const res = await addFirstProductAction(fd);
      if (!res.success) {
        setErrorMsg(res.error || "Gagal menambahkan produk.");
        return;
      }

      setCurrentStep(3);
    } catch {
      setErrorMsg("Terjadi kesalahan sistem saat menambahkan produk.");
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Step 4: First Transaction Polling
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (currentStep !== 4 || !business || firstTxRecorded) return;

    const interval = setInterval(async () => {
      const res = await checkFirstTransactionAction(business.id);
      if (res.recorded && res.transaction) {
        setFirstTxRecorded(true);
        setTxDetails(res.transaction);
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [currentStep, business, firstTxRecorded]);

  // --------------------------------------------------------------------------
  // Step 5: Skip or Connect Google Sheets
  // --------------------------------------------------------------------------
  const handleSkipGoogleSheets = async () => {
    if (!business) return;
    setLoading(true);
    try {
      const res = await skipGoogleSheetsAction(business.id);
      if (res.success) {
        setCurrentStep(6);
      }
    } catch {
      setErrorMsg("Gagal menyelesaikan langkah Google Sheets.");
    } finally {
      setLoading(false);
    }
  };

  const copyExampleCommand = () => {
    const text = `Kejual ${productName || "Lele"} 1${unit || "kg"}`;
    navigator.clipboard.writeText(text);
    setCopiedExample(true);
    setTimeout(() => setCopiedExample(false), 2000);
  };

  const stepsMeta = [
    { id: 1, title: "Profil", fullTitle: "Profil Usaha", icon: Building2 },
    { id: 2, title: "Produk", fullTitle: "Produk Pertama", icon: Package },
    { id: 3, title: "Telegram", fullTitle: "Bot Telegram", icon: Bot },
    { id: 4, title: "Transaksi", fullTitle: "Uji Transaksi", icon: Receipt },
    { id: 5, title: "Sheets", fullTitle: "Google Sheets", icon: FileSpreadsheet },
  ];

  const stepDescriptions = [
    "Lengkapi informasi dasar usaha untuk memulai pencatatan dan laporan operasional.",
    "Daftarkan produk utama dan harga jual awal agar bot mengenali transaksi kasir.",
    "Sambungkan akun Telegram kasir ke bot OXID Ledger untuk mulai mencatat transaksi.",
    "Kirim pesan transaksi pertama ke bot Telegram untuk memverifikasi pencatatan otomatis.",
    "Hubungkan Google Sheets sebagai salinan cadangan realtime transaksi Anda (opsional).",
    "Konfigurasi usaha Anda telah siap. Buka dashboard untuk memulai operasional.",
  ];

  return (
    <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
      {/* ========================================================================= */}
      {/* STEP PROGRESS & HEADER SYSTEM                                             */}
      {/* ========================================================================= */}
      <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        {/* Step Info Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Langkah {Math.min(currentStep, 5)} dari 5
              </span>
              <span className="text-xs text-muted">· Onboarding Klien</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {currentStep <= 5 ? stepsMeta[currentStep - 1]?.fullTitle : "Aktivasi Selesai"}
            </h1>
            <p className="text-xs sm:text-sm text-muted leading-relaxed max-w-2xl">
              {stepDescriptions[currentStep - 1] || "Pengaturan awal usaha Anda."}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-surface-hover border border-border text-xs font-semibold tabular-nums text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>{getPercentage()}% Selesai</span>
            </div>
          </div>
        </div>

        {/* Linear Progress Bar */}
        <div className="w-full bg-border/60 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${getPercentage()}%` }}
          />
        </div>

        {/* Desktop Stepper Nodes */}
        <div className="hidden sm:grid grid-cols-5 gap-2 pt-1 border-t border-border/70">
          {stepsMeta.map((s) => {
            const Icon = s.icon;
            const isCompleted = currentStep > s.id;
            const isCurrent = currentStep === s.id;
            return (
              <div
                key={s.id}
                className="flex items-center gap-2.5 py-1 text-xs"
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isCurrent
                      ? "bg-primary text-primary-fg font-bold shadow-xs shadow-primary/20 ring-2 ring-primary/20"
                      : isCompleted
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-surface-hover border border-border text-muted"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="min-w-0">
                  <span
                    className={`block truncate text-xs ${
                      isCurrent
                        ? "font-semibold text-foreground"
                        : isCompleted
                        ? "text-foreground/80 font-medium"
                        : "text-muted"
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile Stepper Chips (360px-430px safe, zero overflow) */}
        <div className="sm:hidden flex items-center justify-between gap-1.5 pt-2 border-t border-border/70">
          {stepsMeta.map((s) => {
            const isCompleted = currentStep > s.id;
            const isCurrent = currentStep === s.id;
            return (
              <div
                key={s.id}
                className={`flex-1 h-1.5 rounded-full transition-all ${
                  isCurrent
                    ? "bg-primary ring-2 ring-primary/20"
                    : isCompleted
                    ? "bg-primary"
                    : "bg-border"
                }`}
                title={s.title}
              />
            );
          })}
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-4 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-3 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Perhatian</p>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: Profil Bisnis                                                     */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Form (8 Cols) */}
          <div className="lg:col-span-8 bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Identitas & Pengaturan Operasional
                </h2>
                <p className="text-xs text-muted">
                  Informasi ini digunakan untuk laporan harian dan pencatatan transaksi Anda.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateBusiness} className="space-y-5">
              {/* Nama Usaha */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-foreground mb-1.5">
                  Nama usaha / toko <span className="text-rose-500">*</span>
                </label>
                <div className="h-[48px] relative flex items-center rounded-xl bg-background border border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-colors shadow-xs">
                  <div className="pl-3.5 flex items-center pointer-events-none text-muted">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Contoh: Tambak Lele Berkah"
                    className="w-full bg-transparent px-3 h-full text-sm text-foreground placeholder:text-muted focus:outline-none"
                  />
                </div>
              </div>

              {/* Jenis Usaha & Nama Pemilik */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-foreground mb-1.5">
                    Jenis usaha
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-[48px] px-3.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xs cursor-pointer"
                  >
                    <option value="Perikanan">Perikanan / Tambak</option>
                    <option value="Peternakan">Peternakan</option>
                    <option value="F&B">Kuliner / F&B</option>
                    <option value="Toko">Toko Kelontong / Retail</option>
                    <option value="Reseller">Reseller / Agen</option>
                    <option value="Distributor">Distributor</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-foreground mb-1.5">
                    Nama pemilik (opsional)
                  </label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Nama Pemilik Usaha"
                    className="w-full h-[48px] px-3.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xs"
                  />
                </div>
              </div>

              {/* Zona Waktu & Satuan Default */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-foreground mb-1.5">
                    Zona waktu operasional
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full h-[48px] px-3.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xs cursor-pointer"
                  >
                    <option value="Asia/Pontianak">Asia/Pontianak (WIB Barat/WITA)</option>
                    <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                    <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                    <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-foreground mb-1.5">
                    Satuan default transaksi
                  </label>
                  <div className="h-[48px] relative flex items-center rounded-xl bg-background border border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-colors shadow-xs">
                    <div className="pl-3.5 flex items-center pointer-events-none text-muted">
                      <Scale className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={defaultUnit}
                      onChange={(e) => setDefaultUnit(e.target.value)}
                      placeholder="kg, pcs, porsi, liter"
                      className="w-full bg-transparent px-3 h-full text-sm text-foreground placeholder:text-muted focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Action Submit */}
              <div className="pt-4 border-t border-border flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto h-[48px] px-8 rounded-xl bg-primary hover:bg-primary-hover text-primary-fg font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menyimpan Profil...</span>
                    </>
                  ) : (
                    <>
                      <span>Simpan Profil & Lanjut</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Guidance Panel (4 Cols, Desktop only) */}
          <div className="hidden lg:block lg:col-span-4 space-y-4">
            <div className="bg-surface/60 border border-border rounded-2xl p-6 space-y-4 text-xs shadow-xs">
              <div className="flex items-center gap-2 text-primary font-semibold">
                <Sparkles className="w-4 h-4" />
                <span>Mengapa data ini diperlukan?</span>
              </div>
              <ul className="space-y-3 text-muted leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                  <span>
                    <strong className="text-foreground">Identitas Usaha:</strong> Tercantum pada tajuk rekap laporan harian dan struk penjualan digital kasir.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                  <span>
                    <strong className="text-foreground">Zona Waktu:</strong> Menentukan jam cut-off pergantian tanggal laporan operasional agar sesuai waktu setempat.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                  <span>
                    <strong className="text-foreground">Satuan Default:</strong> Mempercepat kasir mencatat transaksi di chat tanpa perlu menuliskan nama satuan berulang kali.
                  </span>
                </li>
              </ul>
              <div className="pt-3 border-t border-border flex items-center gap-2 text-[11px] text-muted">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                <span>Data bisnis Anda terisolasi aman dengan enkripsi PostgreSQL.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: Tambah Produk Pertama                                             */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Form (8 Cols) */}
          <div className="lg:col-span-8 bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Katalog Produk Utama
                </h2>
                <p className="text-xs text-muted">
                  Bot mengenali transaksi dari nama produk dan alias yang Anda daftarkan di sini.
                </p>
              </div>
            </div>

            <form onSubmit={handleAddFirstProduct} className="space-y-5">
              {/* Nama Produk */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-foreground mb-1.5">
                  Nama produk <span className="text-rose-500">*</span>
                </label>
                <div className="h-[48px] relative flex items-center rounded-xl bg-background border border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-colors shadow-xs">
                  <div className="pl-3.5 flex items-center pointer-events-none text-muted">
                    <Package className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Contoh: Lele"
                    className="w-full bg-transparent px-3 h-full text-sm text-foreground placeholder:text-muted focus:outline-none"
                  />
                </div>
              </div>

              {/* Satuan & Harga */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-foreground mb-1.5">
                    Satuan unit <span className="text-rose-500">*</span>
                  </label>
                  <div className="h-[48px] relative flex items-center rounded-xl bg-background border border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-colors shadow-xs">
                    <div className="pl-3.5 flex items-center pointer-events-none text-muted">
                      <Scale className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="kg, pcs, ekor"
                      className="w-full bg-transparent px-3 h-full text-sm text-foreground placeholder:text-muted focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-foreground mb-1.5">
                    Harga default (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <div className="h-[48px] relative flex items-center rounded-xl bg-background border border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-colors shadow-xs">
                    <div className="pl-3.5 flex items-center pointer-events-none text-muted">
                      <Coins className="w-4 h-4" />
                    </div>
                    <input
                      type="number"
                      required
                      value={priceIdr}
                      onChange={(e) => setPriceIdr(e.target.value)}
                      placeholder="28000"
                      className="w-full bg-transparent px-3 h-full text-sm text-foreground placeholder:text-muted focus:outline-none tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {/* Alias */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-foreground mb-1.5">
                  Alias / variasi sebutan di chat
                </label>
                <div className="h-[48px] relative flex items-center rounded-xl bg-background border border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-colors shadow-xs">
                  <div className="pl-3.5 flex items-center pointer-events-none text-muted">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={aliases}
                    onChange={(e) => setAliases(e.target.value)}
                    placeholder="lele, ikan lele, lele sangkuriang"
                    className="w-full bg-transparent px-3 h-full text-sm text-foreground placeholder:text-muted focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-muted mt-1.5 leading-relaxed">
                  Pisahkan dengan tanda koma. Membantu sistem mengenali variasi ketikan saat kasir menulis nama produk di chat.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="w-full sm:w-auto h-[48px] px-5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali ke Profil</span>
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto h-[48px] px-8 rounded-xl bg-primary hover:bg-primary-hover text-primary-fg font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menyimpan Produk...</span>
                    </>
                  ) : (
                    <>
                      <span>Simpan Produk & Lanjut</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Live Preview Panel (4 Cols, Desktop only) */}
          <div className="hidden lg:block lg:col-span-4 space-y-4">
            <div className="bg-surface/60 border border-border rounded-2xl p-6 space-y-4 text-xs shadow-xs">
              <div className="flex items-center gap-2 text-primary font-semibold">
                <Sparkles className="w-4 h-4" />
                <span>Pratinjau Pengenalan Bot</span>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-hover border border-border space-y-2">
                <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block">
                  Simulasi Pesan Kasir:
                </span>
                <p className="font-mono text-xs text-foreground font-semibold">
                  &ldquo;Kejual {productName || "Lele"} 2{unit || "kg"}&rdquo;
                </p>
                <div className="pt-2 border-t border-border/80 space-y-1 text-[11px]">
                  <div className="flex justify-between text-muted">
                    <span>Produk:</span>
                    <span className="font-medium text-foreground">{productName || "Lele"}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Total Estimasi:</span>
                    <span className="font-bold text-primary tabular-nums">
                      {formatIDR((Number(priceIdr) || 0) * 2)}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-muted leading-relaxed">
                Anda dapat menambahkan lebih banyak produk, kategori, dan harga grosir kapan saja melalui menu Produk di dashboard.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: Hubungkan Telegram                                                */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div className="max-w-2xl mx-auto w-full bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Hubungkan Akun Bot Telegram
              </h2>
              <p className="text-xs text-muted">
                Hubungkan bot Telegram resmi agar Anda atau kasir dapat langsung mengirim transaksi melalui chat.
              </p>
            </div>
          </div>

          {telegramConnected ? (
            <div className="p-6 sm:p-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/30 shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">
                  Telegram Berhasil Terhubung!
                </h3>
                <p className="text-xs text-muted">
                  {operatorLabel
                    ? `Terdaftar sebagai: ${operatorLabel}`
                    : "Akun Anda telah aktif sebagai operator kasir resmi."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="h-[48px] px-8 rounded-xl bg-primary hover:bg-primary-hover text-primary-fg font-semibold text-sm inline-flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <span>Lanjut ke Transaksi Pertama</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <TelegramPairingCard
                theme={resolvedTheme === "dark" ? "dark" : "light"}
                generateToken={async () => {
                  if (!business) return { success: false, error: "Profil bisnis belum dibuat." };
                  return await generatePairingTokenAction(business.id);
                }}
                checkStatus={async () => {
                  if (!business) return { success: false, paired: false };
                  const res = await checkTelegramStatusAction(business.id);
                  return {
                    success: true,
                    paired: res.connected,
                    operatorLabel: res.operatorLabel,
                  };
                }}
                onSuccess={(details) => {
                  setTelegramConnected(true);
                  if (details?.operatorLabel) setOperatorLabel(details.operatorLabel);
                }}
              />

              <div className="pt-4 border-t border-border flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="h-[44px] px-4 rounded-xl border border-border bg-surface hover:bg-surface-hover text-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali ke Produk</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="text-xs font-medium text-muted hover:text-foreground transition-colors underline"
                >
                  Lewati langkah ini untuk sekarang &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: Catat Transaksi Pertama                                           */}
      {/* ========================================================================= */}
      {currentStep === 4 && (
        <div className="max-w-2xl mx-auto w-full bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Coba Catat Transaksi Pertama
              </h2>
              <p className="text-xs text-muted">
                Buka obrolan Telegram dengan bot, lalu kirim pesan penjualan seperti Anda mengobrol biasa.
              </p>
            </div>
          </div>

          {firstTxRecorded ? (
            <div className="p-6 sm:p-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Transaksi Pertama Anda Berhasil Dicatat!
                  </h3>
                  <p className="text-xs text-muted">
                    Tersimpan secara realtime di buku besar keuangan PostgreSQL.
                  </p>
                </div>
              </div>

              {txDetails && (
                <div className="p-4 rounded-xl bg-surface border border-border text-xs space-y-2">
                  <div className="flex justify-between text-muted">
                    <span>Produk:</span>
                    <span className="text-foreground font-semibold">{txDetails.productName}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Kuantitas:</span>
                    <span className="text-foreground">{txDetails.quantity} {txDetails.unit}</span>
                  </div>
                  <div className="flex justify-between text-muted pt-2 border-t border-border">
                    <span>Total Pembukuan:</span>
                    <span className="text-primary font-bold text-sm tabular-nums">
                      {formatIDR(txDetails.totalAmountIdr)}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setCurrentStep(5)}
                className="w-full h-[48px] px-5 rounded-xl bg-primary hover:bg-primary-hover text-primary-fg font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <span>Lanjut ke Langkah Berikutnya</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-background border border-border space-y-3">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider block">
                  Contoh Pesan Chat di Telegram:
                </span>
                <div className="p-4 rounded-xl bg-surface border border-border flex items-center justify-between gap-3">
                  <span className="font-mono text-base font-bold text-primary">
                    &ldquo;Kejual {productName} 1{unit}&rdquo;
                  </span>
                  <button
                    type="button"
                    onClick={copyExampleCommand}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-hover border border-border text-xs font-medium text-foreground hover:bg-surface transition-colors cursor-pointer"
                  >
                    {copiedExample ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-500">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-muted" />
                        <span>Salin</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  Ketik atau tempel kalimat di atas ke bot Telegram yang telah Anda sambungkan.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-hover border border-border flex items-center gap-3">
                <RefreshCw className="w-4 h-4 text-primary animate-spin shrink-0" />
                <span className="text-xs text-muted">
                  Menunggu Anda mengirim transaksi pertama di Telegram... (otomatis terdeteksi)
                </span>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="h-[44px] px-4 rounded-xl border border-border bg-surface hover:bg-surface-hover text-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali ke Telegram</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  className="text-xs font-medium text-muted hover:text-foreground transition-colors underline"
                >
                  Lewati uji transaksi &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 5: Google Sheets (Opsional)                                          */}
      {/* ========================================================================= */}
      {currentStep === 5 && (
        <div className="max-w-2xl mx-auto w-full bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Sinkronisasi Google Sheets (Opsional)
              </h2>
              <p className="text-xs text-muted">
                Gunakan Google Sheets jika Anda atau tim Anda ingin memantau salinan data transaksi dalam format spreadsheet.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-background border border-border space-y-3">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-xs text-foreground space-y-1">
                <p className="font-semibold text-foreground">Bebas Dipilih Kapan Saja</p>
                <p className="text-muted leading-relaxed">
                  Fitur ini tidak wajib untuk menggunakan OXID Ledger. Anda bisa melewatinya sekarang dan menghubungkannya nanti kapan saja dari menu Pengaturan Dashboard.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={handleSkipGoogleSheets}
              disabled={loading}
              className="flex-1 h-[48px] px-5 rounded-xl bg-primary hover:bg-primary-hover text-primary-fg font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Menyelesaikan...</span>
                </>
              ) : (
                <>
                  <span>Lewati untuk Sekarang & Selesai</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <a
              href="/dashboard/settings/google-sheets"
              className="h-[48px] px-5 rounded-xl bg-surface hover:bg-surface-hover text-foreground font-semibold text-xs flex items-center justify-center gap-2 transition-colors border border-border"
            >
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              <span>Hubungkan Spreadsheet</span>
            </a>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 6: Selesai / 100% Onboarding Completed                                */}
      {/* ========================================================================= */}
      {currentStep === 6 && (
        <div className="max-w-xl mx-auto w-full bg-surface border border-border rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-xs animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Selamat! OXID Ledger Siap Digunakan
            </h2>
            <p className="text-xs sm:text-sm text-muted max-w-md mx-auto leading-relaxed">
              Usaha Anda telah terkonfigurasi dengan sukses. Anda dapat langsung memantau transaksi, memeriksa omzet, dan mengelola produk di dashboard.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-background border border-border text-left text-xs space-y-2.5 max-w-sm mx-auto">
            <div className="flex items-center gap-2.5 text-foreground">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Profil Usaha: <strong>{business?.name}</strong></span>
            </div>
            <div className="flex items-center gap-2.5 text-foreground">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Produk Utama: <strong>{productName}</strong></span>
            </div>
            <div className="flex items-center gap-2.5 text-foreground">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Bot Telegram: <strong>Terhubung</strong></span>
            </div>
            <div className="flex items-center gap-2.5 text-foreground">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Masa Uji Coba: <strong>14 Hari Gratis Aktif</strong></span>
            </div>
          </div>

          <div className="pt-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-[50px] px-8 rounded-xl bg-primary hover:bg-primary-hover text-primary-fg font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              <span>Buka Dashboard Bisnis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
