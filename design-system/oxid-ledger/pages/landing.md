# Landing Page Design System Override — OXID Ledger

> **Inheritance:** Extends `design-system/oxid-ledger/MASTER.md`.
> Contains specific design specifications and decisions exclusively for `/` (Landing Page).

---

## 1. Landing Pattern & Architectural Structure

- **Chosen Pattern**: `Real-Time Operations + Product Demo Workflow` (resolved from UI UX Pro Max intelligence).
- **Primary Goal**: Shift from generic AI-SaaS aesthetics to a disciplined, transaction-first operational software platform for Indonesian UMKM.
- **Section Order & Rhythm**:
  1. **Topbar**: Minimal hairline border, violet `OX` monogram mark, operational nav anchors, theme toggle, and compact CTA button.
  2. **Asymmetrical Ledger Hero**:
     - *Left Column (55%)*: Small operational category stamp (`BUKU BESAR KASIR OPERASIONAL`), high-impact editorial headline with unequal scale, concrete factual description, compact dual action row, and an operational speed metric strip.
     - *Right Column (45%)*: **The Transaction Transformation Rail** — a live, visual breakdown showing how raw chat input (`Kejual lele 5kg`) resolves into structured accounting items, journal entries, and automated mirror syncs.
  3. **Operational Metrics Rail**: Ruled horizontal strip displaying real technical facts (e.g. `<1.2s` latency, `100%` double-entry ledger, `PostgreSQL` durable persistence, `Zero POS Hardware`).
  4. **The 4-Stage Transaction Engine**: A horizontal/vertical ruled workflow explaining the lifecycle of every sale: *Input Chat* → *Deterministic Parser* → *Ledger Journaling* → *Sheets Mirror*.
  5. **Interactive Console Showcase**: High-clarity tabbed product preview showing the real application interfaces (Ringkasan Kasir, Mutasi Jurnal, Katalog Produk, Integrasi Bot).
  6. **Ruled Ledger Capabilities (No Card Spam)**: Alternating split ledger rows detailing real operational problems solved (stock tracking, offline cashier resilience, multi-operator controls, real-time daily reports).
  7. **Transparent Pricing Matrix**: Plan matrix for *Pilot*, *Basic*, and *Pro* directly reflecting existing authoritative subscription plans without fake "most popular" labels.
  8. **Operational FAQ**: Numbered two-column layout with clean accessible accordions.
  9. **Compact Closing Action & Ruled Footer**: Minimal, single-row footer with essential links, copyright, and operational status.

---

## 2. Hero Composition Decisions

### Prohibited Legacy Pattern:
- ❌ Centered small pill badge with purple background
- ❌ Giant centered 64px bold headline
- ❌ Two giant pill buttons in the center
- ❌ Giant centered static dashboard screenshot dominating the entire screen

### New Asymmetrical Editorial Composition:
- **Left Column**:
  - Eyebrow: Minimal monochrome tag with hairline rule: `OPERASIONAL TELEGRAM-FIRST · BUKU BESAR KASIR`
  - Headline:
    ```
    Catat penjualan di chat.
    Operasional rapi di buku besar.
    ```
    *Unequal typographic scale: First line in lighter weight, second line in bold emphasis.*
  - Copy: Concrete, jargon-free factual statement:
    `"Kasir cukup mengetik pesan seperti biasa di Telegram. Bot memvalidasi harga, memotong stok, dan mencatat jurnal keuangan secara realtime tanpa instalasi mesin kasir mahal."`
  - Actions:
    - Primary CTA: `Mulai Uji Coba 14 Hari` (`h-[46px] rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold text-sm px-6`)
    - Secondary CTA: `Lihat Simulasi Transaksi ↓` (`h-[46px] rounded-lg border border-border bg-surface hover:bg-surface-hover text-foreground font-medium text-sm px-5`)
  - Operational Proof Bar:
    - `0 Mesin Kasir`: Cukup smartphone kasir
    - `PostgreSQL`: Double-entry ACID ledger
    - `Google Sheets`: Salinan cadangan otomatis

- **Right Column (The Transaction Transformation Rail)**:
  - Header: Ruled transaction journal title: `Jurnal Transaksi Realtime #TX-2904`
  - Phase 1: **Input Percakapan Kasir** (Chat bubble: `"Kejual lele 5kg @28rb tunai"`)
  - Phase 2: **Parsing & Validasi Sistem** (Chips: `Produk: Lele` · `Qty: 5 kg` · `Harga: Rp28.000` · `Metode: Kasir Tunai`)
  - Phase 3: **Posting Buku Kas** (Calculated total: `Rp140.000` recorded with status badge `TERBUKUKAN`)
  - Phase 4: **Sinkronisasi Saluran** (Icons showing real sync: Telegram Bot Bot sent receipt + Sheets row created + PostgreSQL committed)

---

## 3. Component Language Vocabulary

| Component Pattern | Visual Characteristics | Purpose on Landing |
|-------------------|------------------------|--------------------|
| **Ruled Ledger Row** | Full-width or half-width rows divided by `1px border-border`, subtle hover tint, monospace timestamps on left, primary metrics on right. | Eliminates identical feature cards; presents product features as financial ledger rows. |
| **Transaction Strip** | Sequential pill / node connectors (`01 Chat` → `02 Parse` → `03 Jurnal` → `04 Laporan`). | Communicates the deterministic pipeline of the product. |
| **Split Data Panel** | Asymmetric two-column panel: left column contains the operational explanation, right column contains live interactive demonstration. | Interactive product demo and capability showcases. |
| **Technical Badge** | Minimal rectangular tag (`rounded-md`, `border border-border`, font-mono, text-[11px]). | Status tags (`#TX-LIVE`, `POSTGRESQL`, `TELEGRAM API`). |
| **Ruled Pricing Table** | Clean tabular card with ruled tier headers, prominent tabular figures (`Rp149.000 / bln`), and checklist points with green checks. | Transparent subscription pricing without cartoonish cards. |

---

## 4. Typography Decisions & Justifications

- **Headings & Display**: `Plus Jakarta Sans` / `Space Grotesk`
  - *Why*: Strong geometric posture, exceptional legibility at bold weights, avoids the overused generic Inter headline fatigue, provides an engineered, structured feel suitable for bookkeeping.
- **Body Text**: `Plus Jakarta Sans` / `Geist`
  - *Why*: Clear letterforms optimized for reading Indonesian operational sentences and numbers on screens.
- **Numerals**: `tabular-nums`
  - *Why*: Financial amounts must align properly across rows without wobbling.
- **Technical Elements**: `font-mono` (`Geist Mono` / `JetBrains Mono`)
  - *Why*: Exclusively for commands (`/connect`, `Kejual lele 5kg`), timestamps, and journal codes.

---

## 5. Iconography Decisions

- **Single Family**: `Lucide` line icons exclusively.
- **Styling**: `1.5px` or `1.75px` stroke width, monochrome or tinted with `--muted-foreground` and `--primary`.
- **Semantic Roles**:
  - `Receipt`: Sales entries and ledger logs
  - `Bot`: Telegram cashier interface
  - `FileSpreadsheet`: Google Sheets export & sync
  - `Package`: Inventory items and products
  - `CheckCircle2` / `Check`: Reconciled / verified transaction
  - `ArrowRight` / `ArrowUpRight`: Progression and links
- **Forbidden**: Emojis, sparkle AI wands, floating 3D icons, colorful cartoon badges.

---

## 6. Motion Philosophy & Accessibility

- **Standard Duration**: `200ms` with `ease-out`.
- **Interactive Sequence**: Step-by-step transaction demonstration that can be triggered or paused.
- **Reduced Motion**: Full fallback via `@media (prefers-reduced-motion: reduce)`.
- **Contrast**: Contrast ratio >= 5:1 for body and badges in both Light and Dark modes.
