"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Package,
  Bot,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
  Copy,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import {
  createBusinessAction,
  addFirstProductAction,
  generatePairingTokenAction,
  checkTelegramStatusAction,
  checkFirstTransactionAction,
  skipGoogleSheetsAction,
} from "@/app/onboarding/actions";
import { BusinessOnboardingProgress, TelegramPairingTokenResult } from "@/modules/onboarding/types";
import { formatIDR } from "@/modules/subscriptions/plans";

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
  const [pairingToken, setPairingToken] = useState<TelegramPairingTokenResult | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
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
  // Step 3: Telegram Pairing Generation & Polling
  // --------------------------------------------------------------------------
  const loadPairingToken = useCallback(async () => {
    if (!business) return;
    setLoading(true);
    try {
      const res = await generatePairingTokenAction(business.id);
      if (res.success && res.result) {
        setPairingToken(res.result);
      } else {
        setErrorMsg(res.error || "Gagal membuat kode pairing Telegram.");
      }
    } catch {
      setErrorMsg("Kendala komunikasi dengan server.");
    } finally {
      setLoading(false);
    }
  }, [business]);

  // Load pairing token when arriving on step 3
  useEffect(() => {
    let isCancelled = false;
    if (currentStep === 3 && business && !telegramConnected && !pairingToken) {
      generatePairingTokenAction(business.id)
        .then((res) => {
          if (!isCancelled && res.success && res.result) {
            setPairingToken(res.result);
          }
        })
        .catch(() => {
          // Ignored, user can retry with manual refresh button
        });
    }
    return () => {
      isCancelled = true;
    };
  }, [currentStep, business, telegramConnected, pairingToken]);

  // Poll for Telegram connection on Step 3
  useEffect(() => {
    if (currentStep !== 3 || !business || telegramConnected) return;

    const interval = setInterval(async () => {
      const res = await checkTelegramStatusAction(business.id);
      if (res.connected) {
        setTelegramConnected(true);
        if (res.operatorLabel) setOperatorLabel(res.operatorLabel);
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [currentStep, business, telegramConnected]);

  const handleCopyCode = () => {
    if (!pairingToken) return;
    navigator.clipboard.writeText(`/connect ${pairingToken.code}`);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
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

  const stepTitles = [
    "Profil Usaha",
    "Tambah Produk",
    "Hubungkan Telegram",
    "Catat Transaksi",
    "Google Sheets",
    "Selesai",
  ];

  return (
    <div className="max-w-2xl mx-auto w-full py-8 px-4 sm:px-6 space-y-8">
      {/* Top Header & Step Progress */}
      <div className="space-y-4 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Langkah {currentStep} dari 5
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-100">
              {stepTitles[currentStep - 1] || "Aktivasi Klien"}
            </h1>
          </div>
          <div className="flex items-center gap-2 self-center sm:self-auto">
            <span className="text-xs font-mono font-bold text-emerald-400">
              {getPercentage()}% Selesai
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-zinc-800/80 h-2 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${getPercentage()}%` }}
          />
        </div>

        {/* Step Indicator Badges (Horizontal scroll on mobile) */}
        <div className="flex items-center justify-between overflow-x-auto py-1 gap-2 text-[11px] font-medium text-zinc-400 no-scrollbar">
          <span className={currentStep >= 1 ? "text-emerald-400 font-semibold" : ""}>
            1. Profil
          </span>
          <span>&rarr;</span>
          <span className={currentStep >= 2 ? "text-emerald-400 font-semibold" : ""}>
            2. Produk
          </span>
          <span>&rarr;</span>
          <span className={currentStep >= 3 ? "text-emerald-400 font-semibold" : ""}>
            3. Telegram
          </span>
          <span>&rarr;</span>
          <span className={currentStep >= 4 ? "text-emerald-400 font-semibold" : ""}>
            4. Transaksi
          </span>
          <span>&rarr;</span>
          <span className={currentStep >= 5 ? "text-emerald-400 font-semibold" : ""}>
            5. Sheets
          </span>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="rounded-2xl bg-rose-950/40 border border-rose-800/50 p-4 text-xs text-rose-300 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Perhatian</p>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP 1: Profil Bisnis                                              */}
      {/* ------------------------------------------------------------------ */}
      {currentStep === 1 && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-sm">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-400" />
              <span>Lengkapi Informasi Bisnis Anda</span>
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Nama dan zona waktu ini akan digunakan untuk laporan harian dan pencatatan transaksi Anda.
            </p>
          </div>

          <form onSubmit={handleCreateBusiness} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                Nama Usaha / Toko <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Contoh: Tambak Lele Berkah"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Jenis Usaha
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
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
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Nama Pemilik
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Nama Pemilik Usaha"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Zona Waktu
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                >
                  <option value="Asia/Pontianak">Asia/Pontianak (WIB Barat/WITA)</option>
                  <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                  <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                  <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Satuan Default
                </label>
                <input
                  type="text"
                  value={defaultUnit}
                  onChange={(e) => setDefaultUnit(e.target.value)}
                  placeholder="kg, pcs, porsi, liter"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 min-h-[44px] transition-colors"
              >
                {loading ? "Menyimpan Profil..." : "Simpan Profil & Lanjut"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP 2: Tambah Produk Pertama                                      */}
      {/* ------------------------------------------------------------------ */}
      {currentStep === 2 && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-sm">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-400" />
              <span>Tambahkan Produk Utama Anda</span>
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Bot mengenali transaksi dari nama produk dan alias yang Anda daftarkan di sini.
            </p>
          </div>

          <form onSubmit={handleAddFirstProduct} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                Nama Produk <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Contoh: Lele"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Satuan Unit <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="kg, pcs, ekor"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Harga Default (Rp) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={priceIdr}
                  onChange={(e) => setPriceIdr(e.target.value)}
                  placeholder="28000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                Alias / Variasi Nama Chat
              </label>
              <input
                type="text"
                value={aliases}
                onChange={(e) => setAliases(e.target.value)}
                placeholder="lele, ikan lele, lele sangkuriang"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              />
              <p className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed">
                Pisahkan dengan tanda koma. Membantu bot mengenali saat Anda mengetik nama produk dengan sebutan santai di chat.
              </p>
            </div>

            <div className="pt-4 border-t border-zinc-800">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 min-h-[44px] transition-colors"
              >
                {loading ? "Menyimpan Produk..." : "Simpan Produk & Lanjut"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP 3: Hubungkan Telegram                                         */}
      {/* ------------------------------------------------------------------ */}
      {currentStep === 3 && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-sm">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Bot className="w-5 h-5 text-emerald-400" />
              <span>Hubungkan Akun Telegram</span>
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Hubungkan bot Telegram resmi agar Anda dapat langsung mengirim transaksi melalui chat.
            </p>
          </div>

          {telegramConnected ? (
            <div className="p-6 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-300">Telegram Berhasil Terhubung!</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  {operatorLabel ? `Terdaftar sebagai: ${operatorLabel}` : "Akun Anda telah aktif sebagai operator resmi."}
                </p>
              </div>
              <button
                onClick={() => setCurrentStep(4)}
                className="py-3 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm inline-flex items-center gap-2 min-h-[44px] transition-colors shadow-md"
              >
                <span>Lanjut ke Transaksi Pertama</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/20 shrink-0">
                      1
                    </span>
                    <span className="text-xs text-zinc-300">
                      Buka bot resmi di Telegram:{" "}
                      <strong className="text-white font-mono">@{pairingToken?.botUsername || "catfish_ledger_bot"}</strong>
                    </span>
                  </div>

                  {pairingToken?.deepLink && (
                    <a
                      href={pairingToken.deepLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors min-h-[44px]"
                    >
                      <ExternalLink className="w-4 h-4 text-emerald-400" />
                      <span>Buka Bot Telegram Secara Langsung</span>
                    </a>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/20 shrink-0">
                      2
                    </span>
                    <span className="text-xs text-zinc-300">
                      Kirim perintah koneksi berikut ke bot Telegram:
                    </span>
                  </div>

                  <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                    <span className="font-mono text-base font-bold text-emerald-400 flex-1 tracking-wider text-center">
                      /connect {pairingToken?.code || "MEMUAT..."}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedCode ? "Tersalin!" : "Salin"}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-500 text-center">
                    Kode pairing berlaku selama 10 menit untuk keamanan usaha Anda.
                  </p>
                </div>
              </div>

              {/* Waiting status indicator */}
              <div className="p-4 rounded-2xl bg-zinc-950/40 border border-zinc-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
                  <span className="text-xs text-zinc-400">
                    Menunggu Anda mengirim kode ke Telegram...
                  </span>
                </div>
                <button
                  type="button"
                  onClick={loadPairingToken}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  Buat Ulang Kode
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP 4: Catat Transaksi Pertama                                    */}
      {/* ------------------------------------------------------------------ */}
      {currentStep === 4 && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-sm">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-400" />
              <span>Coba Catat Transaksi Pertama</span>
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Buka obrolan Telegram dengan bot, lalu kirim pesan penjualan seperti Anda mengobrol biasa.
            </p>
          </div>

          {firstTxRecorded ? (
            <div className="p-6 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-300">
                    Transaksi Pertama Anda Berhasil Dicatat!
                  </h3>
                  <p className="text-xs text-zinc-400">Tersimpan di buku besar keuangan PostgreSQL.</p>
                </div>
              </div>

              {txDetails && (
                <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between text-zinc-400">
                    <span>Produk:</span>
                    <span className="text-zinc-200 font-semibold">{txDetails.productName}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Kuantitas:</span>
                    <span className="text-zinc-200">{txDetails.quantity} {txDetails.unit}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400 pt-1.5 border-t border-zinc-800">
                    <span>Total Pembukuan:</span>
                    <span className="text-emerald-400 font-bold">{formatIDR(txDetails.totalAmountIdr)}</span>
                  </div>
                </div>
              )}

              <button
                onClick={() => setCurrentStep(5)}
                className="w-full py-3 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm flex items-center justify-center gap-2 min-h-[44px] transition-colors"
              >
                <span>Lanjut ke Langkah Berikutnya</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                  Contoh Pesan Chat di Telegram:
                </span>
                <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 font-mono text-sm font-bold text-center">
                  &ldquo;Kejual {productName} 1{unit}&rdquo;
                </div>
                <p className="text-[11px] text-zinc-500 text-center leading-relaxed">
                  Ketik dan kirim kalimat tersebut ke bot Telegram yang baru saja Anda hubungkan.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950/40 border border-zinc-800 flex items-center gap-3">
                <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
                <span className="text-xs text-zinc-400">
                  Menunggu Anda mengirim transaksi pertama di Telegram...
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP 5: Google Sheets (Opsional)                                   */}
      {/* ------------------------------------------------------------------ */}
      {currentStep === 5 && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-sm">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              <span>Sinkronisasi Google Sheets (Opsional)</span>
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Gunakan Google Sheets jika Anda atau tim Anda masih ingin memantau salinan laporan transaksi dalam format spreadsheet.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-950/60 border border-zinc-800 space-y-3">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-zinc-300 space-y-1">
                <p className="font-semibold text-zinc-100">Bebas Dipilih Kapan Saja</p>
                <p className="text-zinc-400 leading-relaxed">
                  Fitur ini tidak wajib untuk menggunakan OXID Ledger. Anda bisa melewatinya sekarang dan menghubungkannya nanti dari menu Pengaturan Dashboard.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleSkipGoogleSheets}
              disabled={loading}
              className="flex-1 py-3 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm flex items-center justify-center gap-2 min-h-[44px] transition-colors shadow-md"
            >
              <span>Lewati untuk Sekarang & Selesai</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="/dashboard/settings/google-sheets"
              className="py-3 px-5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs flex items-center justify-center gap-2 min-h-[44px] transition-colors border border-zinc-700"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Hubungkan Spreadsheet Sekarang</span>
            </a>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP 6: Selesai / 100% Onboarding Completed                         */}
      {/* ------------------------------------------------------------------ */}
      {currentStep === 6 && (
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl backdrop-blur-md">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-zinc-50">Selamat! OXID Ledger Siap Digunakan</h2>
            <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
              Usaha Anda telah terkonfigurasi dengan sukses. Anda dapat langsung memantau transaksi, memeriksa omzet, dan mengelola produk di dashboard.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800 text-left text-xs space-y-2 max-w-sm mx-auto">
            <div className="flex items-center gap-2 text-zinc-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Profil Usaha: <strong>{business?.name}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-zinc-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Produk Utama: <strong>{productName}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-zinc-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Bot Telegram: <strong>Terhubung</strong></span>
            </div>
            <div className="flex items-center gap-2 text-zinc-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Masa Uji Coba: <strong>14 Hari Gratis Aktif</strong></span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm shadow-xl shadow-emerald-500/20 min-h-[44px] transition-all"
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
