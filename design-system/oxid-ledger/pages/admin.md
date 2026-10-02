# Admin Control Center V2 Design Specification — OXID Ledger

> **Location:** `design-system/oxid-ledger/pages/admin.md`  
> **Target Routes:** `/admin`, `/admin/businesses`, `/admin/businesses/[businessId]`, `/admin/users`, `/admin/subscriptions`, `/admin/payments`, `/admin/settings/billing`, `/admin/audit`, `/admin/system`  
> **Status:** APPROVED SPECIFICATION  
> **Authoritative Baseline:** Customer Dashboard V2 Visual System + UI UX Pro Max Data-Dense Operational System

---

## 1. ADMIN PURPOSE & PHILOSOPHY
The OXID Ledger Admin Control Center is an **operational command center** for platform operators, customer support, and billing administrators. It is NOT a marketing showcase and NOT an AI toy.
- **Primary Goals:**
  1. Instant platform situational awareness (tenant count, active MRR/volume, pending payment queue, backend worker health).
  2. Safe, audit-logged multi-tenant administration (subscriptions, payment confirmations, RBAC roles).
  3. Rapid inspection of customer accounts and technical telemetry.
  4. Full responsiveness across Desktop, Tablet, and Mobile viewports without degrading operational capability.

---

## 2. INFORMATION DENSITY & GEOMETRY
- **Density Level:** 8/10 (High operational density, disciplined whitespace).
- **Desktop Grid:** 12-column flexible grid system; max-width `max-w-7xl` centered.
- **Paddings:**
  - Page canvas: `p-4 sm:p-6 lg:p-8`
  - Cards & containers: `p-4 sm:p-5`
  - Compact operational rows: `px-3 py-2.5`
- **Corner Radii:**
  - Controls, badges, buttons: `rounded-lg` (8px)
  - Tables & internal panels: `rounded-xl` (12px)
  - Outer cards & dialog windows: `rounded-2xl` (16px)

---

## 3. SHELL & NAVIGATION ARCHITECTURE
```
Desktop (>= 1280px):
┌──────────────┬────────────────────────────────────────────────────────┐
│ Sidebar      │ Topbar (Breadcrumbs · Cmd+K Search · Health · Admin)   │
│ (224px       ├────────────────────────────────────────────────────────┤
│  expanded)   │                                                        │
│              │ Admin Content Canvas                                   │
│              │                                                        │
└──────────────┴────────────────────────────────────────────────────────┘

Tablet (768px – 1279px):
┌──────┬────────────────────────────────────────────────────────────────┐
│ Side │ Topbar (Breadcrumbs · Cmd+K Search · Health · Admin)           │
│ (64px├────────────────────────────────────────────────────────────────┤
│ col) │ Admin Content Canvas                                           │
└──────┴────────────────────────────────────────────────────────────────┘

Mobile (<= 767px):
┌───────────────────────────────────────────────────────────────────────┐
│ Topbar [ Hamburger ] [ OXID Admin ] [ Status Dot ] [ Admin Avatar ]  │
├───────────────────────────────────────────────────────────────────────┤
│ Navigation Drawer (Slide-over sheet with full platform menu)          │
├───────────────────────────────────────────────────────────────────────┤
│ Admin Content Canvas (Single column, responsive cards, no overflow)   │
└───────────────────────────────────────────────────────────────────────┘
```
- **Desktop Sidebar:** 224px expanded, collapsible down to 64px icon-only rail via toggle button.
- **Active Link State:** Subtle violet tint (`bg-primary/10 text-primary border-l-2 border-primary`), NEVER emerald green.
- **Sidebar Groups:**
  1. `PLATFORM`: Overview (`/admin`), Bisnis Klien (`/admin/businesses`), Pengguna & Admin (`/admin/users`), Langganan SaaS (`/admin/subscriptions`), Konfirmasi Bayar (`/admin/payments`).
  2. `OPERASIONAL`: Status Sistem (`/admin/system`), Audit Trail (`/admin/audit`).
  3. `KONFIGURASI`: Pengaturan Tagihan (`/admin/settings/billing`).
  4. Footer: Link back to merchant dashboard (`/dashboard`).

---

## 4. TOPBAR SPECIFICATION
- **Height:** 56px sticky top bar.
- **Left:** Hierarchical breadcrumb (`OXID Admin` / `[Current Page]`) with mobile menu trigger.
- **Center:** Quick Search / Command Palette shortcut trigger (`Ctrl+K` or `⌘K`) for rapid page navigation.
- **Right:**
  - Real-time System Status Pill (e.g., `5/6 Layanan Siap` with pulse dot).
  - Theme Selector (`light` / `dark` / `system`).
  - Admin Account badge showing authoritative role (`super_admin`, `billing_admin`, etc.).

---

## 5. TYPOGRAPHY & NUMERICAL DISPLAY
- **Display & Headings:** `Plus Jakarta Sans` / Inter (`font-semibold tracking-tight`).
  - Page title: `text-xl sm:text-2xl font-bold tracking-tight`
  - Section title: `text-sm font-bold`
  - Small header / metadata: `text-xs font-semibold`
- **Data & Numbers:** Tabular figures mandatory (`tabular-nums font-semibold`), using primary interface font for high-level KPIs.
- **Monospace Reserved For:**
  - Technical IDs (`bus_xyz`, `usr_123`)
  - Timestamps (`03/10/2026 02:15`)
  - Action codes (`SUBSCRIPTION_EXTENDED`, `PAYMENT_CONFIRMED`)
  - Currency references & Telegram channel handles.

---

## 6. COLOR & SEMANTIC STATUS SYSTEM
- **Surfaces:**
  - Canvas: `bg-background` (`#09090B` dark / `#F8FAFC` light)
  - Card/Panel: `bg-card` (`#121215` dark / `#FFFFFF` light)
  - Elevated/Hover: `bg-muted/50` / `bg-accent/40`
  - Borders: `border-border` (`#27272A` dark / `#E4E4E7` light)
- **Primary Brand Accent:** OXID Violet (`#8B5CF6` / `#7C3AED`) used for active navigation tabs, interactive focus states, and primary admin buttons.
- **Semantic Status Matrix (Text + Color + Icon mandatory):**
  - **Healthy / Active / Verified:** Emerald Green (`text-emerald-500 bg-emerald-500/10 border-emerald-500/20` + `CheckCircle2`)
  - **Trialing / Informational:** Sky Blue (`text-sky-400 bg-sky-400/10 border-sky-400/20` + `Info`)
  - **Pending / Warning / Grace Period:** Amber (`text-amber-400 bg-amber-400/10 border-amber-400/20` + `Clock` or `AlertTriangle`)
  - **Suspended / Rejected / Error:** Rose/Red (`text-rose-400 bg-rose-400/10 border-rose-400/20` + `AlertCircle` or `XCircle`)
  - **Deferred / Inactive / Cancelled:** Muted Slate/Zinc (`text-zinc-400 bg-zinc-800 border-zinc-700` + `MinusCircle`)

---

## 7. TABLE SYSTEM & RESPONSIVE BEHAVIOR
- **Desktop Table Architecture:**
  - Row height: 44–48px.
  - Header: `text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30 border-b border-border`.
  - Body row: `hover:bg-muted/40 transition-colors border-b border-border/60 text-xs`.
  - Financial & numerical columns right-aligned with `tabular-nums`.
- **Mobile Responsive Transformation:**
  - Tables do NOT scroll infinitely off-screen or shrink fonts to unreadable sizes.
  - On viewports `< 768px`, data transforms into **Structured Operational Cards**:
    - Header: Primary entity name + Status pill.
    - Body: 2-column key-value grid (Owner, Plan, Created, Expiry).
    - Footer: Action buttons full-width or side-by-side with clear hit areas (minimum 44px tap targets).

---

## 8. PERMISSION-AWARE UI (RBAC INTEGRATION)
- Strictly preserves existing role checks without alteration:
  - `super_admin`: Full management rights across users, subscriptions, payments, billing settings, and system inspection.
  - `billing_admin`: Manages payments, subscriptions, and billing settings.
  - `support_admin`: Tenant inspection and support tools.
  - `viewer`: Read-only access across all operational tables.
- Destructive and administrative action buttons (`Aktivasi`, `Tangguhkan`, `Batalkan`, `Konfirmasi Bayar`, `Hapus Rekening`) remain strictly guarded by `canMutate` / `isSuperAdmin` flags.

---

## 9. COMPONENT VOCABULARY & ANTI-AI-SLOP RULES
- **Anti-Patterns Prohibited:**
  - No generic 4-identical-rectangle KPI grids.
  - No purple-to-pink gradient cards or pulsing neon glows.
  - No fake metrics (e.g. 99.99% fake uptime, synthetic server response graphs).
  - No giant cards with centered text and tiny icons in colored squares.
  - No emojis as navigation or status indicators.
- **Prescribed Components:**
  - `AdminShell`: Responsive frame with collapsible desktop sidebar, sticky topbar, and mobile slide-over sheet.
  - `AdminCommandPalette`: Navigation search modal (`Ctrl+K`).
  - `AdminMetricCard`: High-priority vs. secondary operational metric cards.
  - `ChannelHealthRow`: Compact, dense service integration telemetry.
  - `OperationalTable`: Reusable high-density table with mobile card fallback.
  - `ActionConfirmationDialog`: Safe modal for destructive/critical admin mutations.

---

## 10. VERIFICATION CHECKLIST
- [x] Zero changes to backend logic, server actions, Supabase RPC, or migrations.
- [x] Full responsive support for 1536px, 1440px, 1280px, 1024px, 768px, 430px, 390px, 360px.
- [x] Light and Dark theme validated.
- [x] Strict RBAC button gating maintained.
- [x] 62/62 parser tests pass.
