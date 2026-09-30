import { checkServerEnv } from "@/config/env";

export default function Home() {
  const envCheck = checkServerEnv();

  const modules = [
    { name: "Auth & RBAC", desc: "User identity, session management, and business memberships" },
    { name: "Businesses (Multi-Tenant)", desc: "Isolated tenant boundaries via business_id" },
    { name: "Products Catalog", desc: "Decimal units, alias dictionaries, and integer IDR pricing" },
    { name: "Transactions Ledger", desc: "Fractional quantities, audit trails, and financial records" },
    { name: "WhatsApp Connections", desc: "Decoupled channel endpoints and phone number rotation" },
    { name: "Reports Engine", desc: "Aggregation contracts for daily, weekly, and monthly summaries" },
    { name: "Settings", desc: "Tenant-level preferences, automated templates, and timezone" },
    { name: "Downstream Integrations", desc: "Optional sinks (Google Sheets, webhooks) with PostgreSQL source of truth" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Top Banner */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
              OX
            </div>
            <div>
              <h1 className="font-semibold text-zinc-100 tracking-tight text-base">OXID WA Ledger</h1>
              <p className="text-xs text-zinc-400">Foundation Core v1.0.0</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors shadow-xs"
            >
              Buka Dashboard
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12 space-y-12">
        {/* Hero Section */}
        <section className="space-y-4">
          <div className="inline-block px-3 py-1 rounded-md text-xs font-mono font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/40">
            STEP 1 COMPLETE • PRODUCTION READY SHELL
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-50">
            OXID WA Ledger
          </h2>
          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl leading-relaxed">
            WhatsApp-first transaction recording system engineered for small businesses.
            Built with Next.js App Router, strict TypeScript, Supabase PostgreSQL, and multi-tenant SaaS architecture.
          </p>
        </section>

        {/* Environment & Supabase Status Card */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-wide uppercase text-zinc-400">
              Configuration & Environment Status
            </h3>
            <span
              className={`text-xs px-2.5 py-1 rounded-md font-medium border ${
                envCheck.isValid
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/30"
              }`}
            >
              {envCheck.isValid ? "Supabase Configured" : "Awaiting .env.local"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
              <span className="text-xs text-zinc-400 block mb-1">NEXT_PUBLIC_SUPABASE_URL</span>
              <span className="text-xs font-mono text-zinc-200">
                {process.env.NEXT_PUBLIC_SUPABASE_URL ? "✓ Defined" : "Pending .env.local"}
              </span>
            </div>

            <div className="p-4 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
              <span className="text-xs text-zinc-400 block mb-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
              <span className="text-xs font-mono text-zinc-200">
                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✓ Defined" : "Pending .env.local"}
              </span>
            </div>

            <div className="p-4 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
              <span className="text-xs text-zinc-400 block mb-1">SUPABASE_SERVICE_ROLE_KEY</span>
              <span className="text-xs font-mono text-zinc-200">
                {process.env.SUPABASE_SERVICE_ROLE_KEY ? "✓ Defined (Server Only)" : "Pending .env.local"}
              </span>
            </div>
          </div>

          {!envCheck.isValid && (
            <div className="mt-4 p-4 rounded-lg bg-amber-950/20 border border-amber-800/30 text-xs text-amber-300 space-y-1">
              <p className="font-semibold">Setup Notice:</p>
              <p className="text-amber-300/80">
                Supabase credentials have not been provided yet. Populate your credentials in{" "}
                <code className="bg-amber-900/40 px-1 py-0.5 rounded text-amber-200">.env.local</code> based on{" "}
                <code className="bg-amber-900/40 px-1 py-0.5 rounded text-amber-200">.env.example</code> when ready.
              </p>
            </div>
          )}
        </section>

        {/* Modular Architecture Prepared */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold tracking-wide uppercase text-zinc-400">
            Prepared Architecture Modules
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {modules.map((mod) => (
              <div
                key={mod.name}
                className="p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/20 hover:border-zinc-700 transition-colors"
              >
                <div className="h-2 w-2 rounded-full bg-emerald-400 mb-3" />
                <h4 className="font-medium text-zinc-100 text-sm mb-1">{mod.name}</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">{mod.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Core Principles */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-6 space-y-4">
          <h3 className="text-sm font-semibold tracking-wide uppercase text-zinc-400">
            Core Architectural Principles
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-zinc-300">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span><strong>Tenant Isolation:</strong> Every record is scoped to <code className="text-emerald-400 font-mono">business_id</code> with strict RLS enforcement.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span><strong>Decoupled Channels:</strong> Business identity does not depend on phone numbers; WhatsApp connections are replaceable.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span><strong>Exact Math:</strong> Monetary values avoid floating-point errors (integer/numeric); quantities support decimal fractional values.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span><strong>Single Source of Truth:</strong> PostgreSQL stores authoritative ledger data; Google Sheets serves as an optional downstream export.</span>
            </li>
          </ul>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 py-6 px-6 text-center text-xs text-zinc-400">
        OXID WA Ledger &copy; {new Date().getFullYear()} — Multi-tenant WhatsApp-First Ledger Foundation
      </footer>
    </div>
  );
}
