# OXID WA Ledger

WhatsApp-first transaction recording system engineered for small businesses.

Built on Next.js 16 App Router, TypeScript strict, Supabase PostgreSQL, and Vercel.

---

## Foundation Status (Step 1)

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS v4
- **Database / Auth**: Supabase (@supabase/supabase-js, @supabase/ssr)
- **Hosting Target**: Vercel
- **Architecture**: Modular Multi-Tenant Domain Core

---

## Architectural Principles

1. **`business_id` Tenant Boundary**: All operational records (`products`, `whatsapp_connections`, `transactions`, `settings`, `integrations`) are scoped to `business_id` with Supabase Row Level Security (RLS).
2. **Decoupled Identity & WhatsApp**: Business identity does NOT depend on a WhatsApp phone number. WhatsApp connections are replaceable channels.
3. **PostgreSQL as Single Source of Truth**: Primary transactions and audit trails reside in PostgreSQL; Google Sheets is an optional downstream output.
4. **Exact Monetary Math**: Monetary values avoid floating-point errors (stored in whole IDR integer or fixed precision).
5. **Fractional Quantities**: Decimal quantities (e.g., `1.5 kg`, `20.75 kg`) are supported via `numeric(12, 3)`.
6. **Domain Agnostic**: Not hardcoded to any single pilot business.

For full schema details, see [docs/database-architecture.md](docs/database-architecture.md).

---

## Project Structure

```
oxid-wa-ledger/
├── docs/
│   └── database-architecture.md   # Complete database schema & RLS specification
├── src/
│   ├── app/                       # Next.js App Router shell & layouts
│   ├── config/
│   │   ├── env.ts                 # Server-only typed environment validation
│   │   └── env.client.ts          # Browser-safe public environment config
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts          # Browser Supabase client (@supabase/ssr)
│   │       ├── server.ts          # Server Supabase client (@supabase/ssr)
│   │       ├── admin.ts           # Service-role admin client (server-only)
│   │       ├── middleware.ts      # Auth session refresh handler
│   │       └── index.ts
│   ├── modules/                   # Domain architecture modules
│   │   ├── auth/                  # RBAC, memberships, users
│   │   ├── businesses/            # Multi-tenant business definitions
│   │   ├── products/              # Catalog, aliases, units, pricing
│   │   ├── transactions/          # Ledger entries, items, quantities
│   │   ├── whatsapp/              # Decoupled WhatsApp connections
│   │   ├── reports/               # Aggregation contracts
│   │   ├── settings/              # Business configurations & templates
│   │   └── integrations/          # External sinks (Google Sheets, etc.)
│   ├── types/
│   │   └── database.ts            # Supabase database schema contracts
│   └── middleware.ts              # Next.js root middleware
├── .env.example                   # Environment variable template
└── .gitignore
```

---

## Getting Started

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/ilhammu29/oxid-wa-ledger.git
cd oxid-wa-ledger
npm install
```

### 2. Configure Environment Variables

Create `.env.local` based on `.env.example`:

```bash
cp .env.example .env.local
```

Populate the required credentials from your Supabase project:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application shell.

### 4. Build for Production

```bash
npm run build
npm run start
```
