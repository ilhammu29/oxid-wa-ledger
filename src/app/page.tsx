import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAllPlans, formatIDR } from "@/modules/subscriptions/plans";
import Link from "next/link";
import {
  MessageSquare,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  Clock,
  Sparkles,
  HelpCircle,
  Zap,
  BarChart3,
  Bot,
  Layers,
  ChevronDown,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const plans = getAllPlans();

  const problems = [
    {
      title: "Nota & Catatan Tercecer",
      description: "Penjualan tercatat di chat yang terpisah-pisah, kertas nota mudah hilang, dan sulit direkap.",
      icon: MessageSquare,
    },
    {
      title: "Rekap Malam Hari Makan Waktu",
      description: "Lelah setelah seharian bekerja masih harus menyalin chat ke buku kas atau spreadsheet secara manual.",
      icon: Clock,
    },
    {
      title: "Hitungan Kalkulator Rawan Selisih",
      description: "Perhitungan koma kilogram dan harga satuan bertingkat rawan salah hitung dan membingungkan pembagian hasil.",
      icon: Layers,
    },
  ];

  const steps = [
    {
      number: "01",
      title: "Kirim Chat ke Telegram",
      description: "Cukup ketik transaksi dengan kalimat wajar di bot Telegram seperti chat sehari-hari. Contoh: \"Kejual lele 10kg\".",
    },
    {
      number: "02",
      title: "OXID Mencatat Otomatis",
      description: "Mesin pencatat otomatis mengenali produk, alias, kuantitas, dan menghitung total rupiah ke buku besar keuangan Anda.",
    },
    {
      number: "03",
      title: "Pantau Dashboard & Laporan",
      description: "Lihat omzet harian secara instan di dashboard web, unduh rekap Excel, atau hubungkan cermin Google Sheets.",
    },
  ];

  const features = [
    {
      title: "Catat Cepat via Telegram",
      desc: "Tidak perlu install aplikasi baru. Cukup kirim pesan singkat di Telegram yang sudah terbiasa digunakan.",
      icon: Bot,
    },
    {
      title: "Pengenalan Produk & Alias",
      desc: "Bot mengenali singkatan dan sebutan khas usaha Anda seperti 'lele', 'ikan lele', atau 'lele konsumsi'.",
      icon: Sparkles,
    },
    {
      title: "Hitungan Rupiah Pasti Akurat",
      desc: "Mendukung desimal kilogram (misal 2,5kg) tanpa pembulatan mengambang yang menyebabkan selisih kas.",
      icon: Zap,
    },
    {
      title: "Ringkasan Tutup Buku Otomatis",
      desc: "Ketik 'laporan hari ini' kapan saja untuk melihat total kuantitas dan omzet rupiah yang berhasil dibukukan.",
      icon: BarChart3,
    },
    {
      title: "Mirror Google Sheets Opsional",
      desc: "Hubungkan spreadsheet jika Anda ingin tim atau partner memantau pembukuan lewat Google Sheets.",
      icon: FileSpreadsheet,
    },
    {
      title: "Keamanan Data Multi-Tenant",
      desc: "Setiap bisnis terisolasi ketat dengan Row Level Security. Data transaksi Anda tidak akan bocor ke bisnis lain.",
      icon: ShieldCheck,
    },
  ];

  const faqs = [
    {
      q: "Apakah saya harus menginstal aplikasi baru di handphone?",
      a: "Tidak perlu. Anda dan staf usaha Anda cukup menggunakan aplikasi Telegram yang sudah umum digunakan.",
    },
    {
      q: "Bagaimana jika ada pelanggan yang mengetik nama produk secara berbeda?",
      a: "OXID Ledger dilengkapi fitur Alias Produk. Anda bisa menambahkan nama-nama lain produk Anda (misal 'lele', 'lele sangkuriang', 'ikan lele') sehingga bot langsung mengenalinya.",
    },
    {
      q: "Apakah transaksi yang salah ketik bisa dibatalkan atau dikoreksi?",
      a: "Bisa. Anda dapat membatalkan transaksi langsung melalui chat bot atau mengelolanya dari halaman dashboard transaksi.",
    },
    {
      q: "Apakah wajib menghubungkan Google Sheets?",
      a: "Sama sekali tidak wajib. Google Sheets adalah fitur pelengkap (cermin data) satu arah bagi Anda yang menyukai format spreadsheet.",
    },
    {
      q: "Bagaimana sistem pembayarannya setelah masa uji coba gratis 14 hari?",
      a: "Setelah masa uji coba berakhir, data Anda tetap aman tersimpan. Anda dapat memperpanjang paket langganan secara mudah melalui transfer bank manual yang diverifikasi tim OXID.",
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Navbar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-6 py-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm shadow-xs">
              OX
            </div>
            <div>
              <span className="font-bold text-zinc-100 tracking-tight text-base block">OXID Ledger</span>
              <span className="text-[10px] text-zinc-400 block -mt-0.5">Catat Lewat Chat • Bisnis Rapi</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-zinc-400">
            <a href="#masalah" className="hover:text-zinc-200 transition-colors">Masalah</a>
            <a href="#cara-kerja" className="hover:text-zinc-200 transition-colors">Cara Kerja</a>
            <a href="#fitur" className="hover:text-zinc-200 transition-colors">Fitur</a>
            <a href="#harga" className="hover:text-zinc-200 transition-colors">Harga</a>
            <a href="#faq" className="hover:text-zinc-200 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors shadow-sm"
              >
                <span>Buka Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden sm:inline-flex px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white transition-colors"
                >
                  Masuk
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors shadow-sm"
                >
                  <span>Mulai Gratis</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 space-y-20 sm:space-y-28 pb-20">
        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-6 pt-16 sm:pt-24 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/40">
            <Sparkles className="w-3.5 h-3.5" />
            <span>OXID Ledger • Untuk UMKM & Pedagang</span>
          </div>

          <div className="space-y-4 max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-zinc-50 leading-[1.15]">
              Catat lewat chat. <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                Bisnis tetap rapi.
              </span>
            </h1>
            <p className="text-base sm:text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto">
              Catat penjualan cukup lewat Telegram. Transaksi otomatis masuk ke dashboard dan laporan pembukuan usaha tanpa perlu aplikasi rumit.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {user ? (
              <Link
                href="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-all shadow-lg shadow-emerald-500/10 min-h-[44px]"
              >
                <span>Buka Dashboard Bisnis</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                href="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-all shadow-lg shadow-emerald-500/10 min-h-[44px]"
              >
                <span>Mulai Gratis 14 Hari</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <a
              href="#cara-kerja"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-medium bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 transition-colors min-h-[44px]"
            >
              <span>Lihat Cara Kerja</span>
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            </a>
          </div>

          {/* Telegram Chat Mockup */}
          <div className="pt-8 max-w-md mx-auto">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 shadow-2xl backdrop-blur-md text-left">
              <div className="flex items-center gap-3 pb-3 border-b border-zinc-800/80 px-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold">
                  OX
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-200">OXID Ledger Bot</p>
                  <p className="text-[10px] text-emerald-400">bot aktif • online</p>
                </div>
              </div>

              <div className="py-4 space-y-3 font-sans text-xs">
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="bg-emerald-600 text-white px-3.5 py-2 rounded-2xl rounded-tr-xs max-w-[80%] shadow-xs">
                    <p>Kejual lele 10kg</p>
                    <span className="text-[9px] text-emerald-200 block text-right mt-0.5">14:20</span>
                  </div>
                </div>

                {/* Bot Reply */}
                <div className="flex justify-start">
                  <div className="bg-zinc-800/90 text-zinc-200 border border-zinc-700/60 px-3.5 py-2.5 rounded-2xl rounded-tl-xs max-w-[85%] shadow-xs space-y-1">
                    <p className="font-semibold text-emerald-400">✅ Transaksi Berhasil Dicatat</p>
                    <p className="text-zinc-300">
                      • Produk: <strong className="text-white">Lele (10 kg)</strong><br />
                      • Harga: Rp 28.000 / kg<br />
                      • Total: <strong className="text-white">Rp 280.000</strong>
                    </p>
                    <p className="text-[10px] text-zinc-400 pt-1 border-t border-zinc-700/50">
                      Total hari ini: 10 kg | Rp 280.000
                    </p>
                    <span className="text-[9px] text-zinc-400 block text-right mt-0.5">14:20</span>
                  </div>
                </div>

                {/* User Message 2 */}
                <div className="flex justify-end">
                  <div className="bg-emerald-600 text-white px-3.5 py-2 rounded-2xl rounded-tr-xs max-w-[80%] shadow-xs">
                    <p>Laporan hari ini</p>
                    <span className="text-[9px] text-emerald-200 block text-right mt-0.5">17:05</span>
                  </div>
                </div>

                {/* Bot Reply 2 */}
                <div className="flex justify-start">
                  <div className="bg-zinc-800/90 text-zinc-200 border border-zinc-700/60 px-3.5 py-2.5 rounded-2xl rounded-tl-xs max-w-[85%] shadow-xs space-y-1">
                    <p className="font-semibold text-emerald-400">📊 Rekap Penjualan Hari Ini</p>
                    <p className="text-zinc-300">
                      • Lele: 45 kg (Rp 1.260.000)<br />
                      • Nila: 20 kg (Rp 640.000)
                    </p>
                    <p className="text-zinc-100 font-bold text-xs pt-1 border-t border-zinc-700/50">
                      Total Omzet: Rp 1.900.000
                    </p>
                    <span className="text-[9px] text-zinc-400 block text-right mt-0.5">17:05</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Problem Section */}
        <section id="masalah" className="max-w-6xl mx-auto px-6 space-y-10 scroll-mt-24">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-rose-400">Masalah Pembukuan Harian</h2>
            <p className="text-2xl sm:text-3xl font-bold text-zinc-100">
              Masih mencatat penjualan dari chat ke spreadsheet secara manual?
            </p>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Sebagian besar waktu pedagang dan pemilik UMKM habis untuk urusan teknis mencatat dan menghitung ulang di malam hari.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {problems.map((prob, i) => (
              <div
                key={i}
                className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 space-y-3 relative overflow-hidden"
              >
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                  <prob.icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-zinc-100">{prob.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{prob.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works Section */}
        <section id="cara-kerja" className="max-w-6xl mx-auto px-6 space-y-12 scroll-mt-24">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Cara Kerja Praktis</h2>
            <p className="text-2xl sm:text-3xl font-bold text-zinc-100">
              Mulai dalam 3 langkah mudah
            </p>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Tinggalkan pencatatan ganda. Cukup kirim chat dari gudang, kolam, atau toko Anda.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {steps.map((st, i) => (
              <div
                key={i}
                className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-4 relative"
              >
                <span className="text-3xl font-black font-mono text-emerald-500/30">{st.number}</span>
                <h3 className="text-base font-bold text-zinc-100">{st.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{st.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section id="fitur" className="max-w-6xl mx-auto px-6 space-y-10 scroll-mt-24">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Fitur Dirancang Untuk Anda</h2>
            <p className="text-2xl sm:text-3xl font-bold text-zinc-100">
              Semua yang Anda butuhkan untuk pembukuan rapi
            </p>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Sistem handal dengan arsitektur multi-tenant PostgreSQL yang menjaga keutuhan data keuangan Anda.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700/80 transition-colors space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-zinc-100">{f.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing Section (Authoritative catalog) */}
        <section id="harga" className="max-w-6xl mx-auto px-6 space-y-10 scroll-mt-24">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Pilihan Paket Langganan</h2>
            <p className="text-2xl sm:text-3xl font-bold text-zinc-100">
              Harga transparan, mulai tanpa komitmen
            </p>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Semua akun baru otomatis mendapatkan masa uji coba gratis 14 hari tanpa biaya tersembunyi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((p) => {
              const isPilot = p.code === "pilot";
              const isPro = p.code === "pro";
              return (
                <div
                  key={p.code}
                  className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between border transition-all ${
                    isPilot
                      ? "bg-zinc-900/60 border-emerald-500/40 ring-1 ring-emerald-500/20"
                      : "bg-zinc-900/30 border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">{p.name}</span>
                      {isPilot && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          Uji Coba 14 Hari
                        </span>
                      )}
                      {isPro && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                          Paling Lengkap
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl sm:text-4xl font-extrabold text-zinc-100">
                          {formatIDR(p.priceIdr)}
                        </span>
                        <span className="text-xs text-zinc-500 font-medium">
                          {isPilot ? ` / ${p.durationDays} hari` : " / bulan"}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{p.description}</p>
                    </div>

                    <div className="pt-4 border-t border-zinc-800/80 space-y-2.5">
                      {p.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs text-zinc-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-8">
                    {user ? (
                      <Link
                        href="/dashboard/subscription"
                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                          isPilot
                            ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-sm"
                            : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                        }`}
                      >
                        <span>Kelola Langganan</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <Link
                        href="/signup"
                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                          isPilot
                            ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-sm"
                            : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                        }`}
                      >
                        <span>Mulai 14 Hari Gratis</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="max-w-4xl mx-auto px-6 space-y-8 scroll-mt-24">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Tanya Jawab</h2>
            <p className="text-2xl sm:text-3xl font-bold text-zinc-100">Pertanyaan yang Sering Diajukan</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <h3 className="text-sm font-bold text-zinc-100">{faq.q}</h3>
                </div>
                <p className="text-xs text-zinc-400 pl-6 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA Banner */}
        <section className="max-w-4xl mx-auto px-6">
          <div className="bg-gradient-to-b from-zinc-900 to-zinc-900/70 border border-zinc-800 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-50">
              Mulai Rampingkan Pembukuan Usaha Anda Hari Ini
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
              Bergabung sekarang dan rasakan kemudahan mencatat penjualan cukup dari chat Telegram. 14 hari uji coba gratis tanpa komitmen.
            </p>
            <div className="pt-2">
              {user ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-all shadow-lg shadow-emerald-500/20"
                >
                  <span>Buka Dashboard Bisnis</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-all shadow-lg shadow-emerald-500/20"
                >
                  <span>Mulai Gratis 14 Hari</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 py-8 px-6 text-center text-xs text-zinc-500 space-y-2">
        <p>OXID Ledger &copy; {new Date().getFullYear()} — Catat lewat chat, bisnis tetap rapi.</p>
        <p className="text-[11px] text-zinc-600">
          Sistem pembukuan percakapan multi-tenant aman didukung PostgreSQL & Telegram.
        </p>
      </footer>
    </div>
  );
}
