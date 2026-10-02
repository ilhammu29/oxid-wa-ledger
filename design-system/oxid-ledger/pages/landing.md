# Landing Page Design System Specification — OXID Ledger (RedSun Reference Reset)

> **REFERENCE-FIRST VISUAL DIRECTION:** Inspired by `https://ovo-redsun.webflow.io/`.
> **GOAL:** Approachable, polished, confident, modern SaaS for Indonesian UMKM owners.
> **ANTI-THESIS:** Rejects developer-tool aesthetics, dense transaction engine simulators, debit/credit accounting code dumps, and excessive monospace.

---

## 1. REFERENCE INSPIRATION: RedSun Webflow
- **Aesthetic**: Dark, atmospheric, high-polish B2B SaaS with a single signature illuminated visual anchor behind a prominent product showcase.
- **Rhythm**:
  - Restrained, quiet topbar with plain text navigation (no numbered `01`, `02`).
  - Centered hero with strong, clear human value proposition:
    - Small announcement badge.
    - Large punchy headline ("Catat penjualan tanpa ribet.").
    - Short, accessible UMKM description.
    - Dual CTAs with clean arrow indicators.
    - Large, elevated product showcase frame with soft atmospheric glow.
  - Ecosystem / "Works With" strip (Telegram, Google Sheets, Web Dashboard).
  - 4 Large Alternating Feature Showcases (Text + Realistic Graphic Mockup).
  - 4-item Product Capability Grid with minimal copy and focused icons.
  - How It Works ("Mulai dalam beberapa menit") 3-step timeline.
  - Clean, dedicated Pricing Matrix (Pilot, Basic, Pro from authoritative plans).
  - Numbered Editorial FAQ with clean hairlines.
  - Compelling Final CTA Box with atmospheric radial visual.
  - Minimal, real-link Footer.

---

## 2. VISUAL PRINCIPLES
1. **Product-First & Approachable**: The software must look intuitive to a store owner, warung keeper, or fish farm manager within 3 seconds of glancing at the screen.
2. **One Signature Visual Gesture**: A soft, illuminated violet/indigo atmospheric radial glow behind the hero product showcase and final CTA, creating depth without chaotic particles or nebula blobs.
3. **Generous Spacing & High-Contrast Hierarchy**: Ample vertical breathing room (`py-20 sm:py-28`), large headlines (56–64px desktop), and crisp high-contrast body copy.
4. **Realistic Simplified UI Showcase**: Product mockups represent the real OXID dashboard (revenue charts, recent order feeds, product catalog, bot status), simplified for marketing clarity without turning into a confusing developer console.

---

## 3. HERO COMPOSITION
- **Top**: Small restrained badge: `Pembaruan v2.4 · Catat dari Telegram & WhatsApp`
- **Headline**:
  - Primary: `Catat penjualan tanpa ribet.`
  - Secondary: `Semua transaksi usaha, tetap rapi.`
- **Description**:
  `Catat penjualan lewat Telegram, pantau transaksi dari dashboard, dan simpan laporan usaha secara otomatis.`
- **CTAs**:
  - Primary: `Mulai Gratis 14 Hari` (`h-12 px-6 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold text-sm shadow-md`)
  - Secondary: `Pelajari Fitur ↓` (`h-12 px-5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-foreground font-medium text-sm`)
- **Product Visual Showcase**:
  - Polished browser/app window frame (`rounded-2xl border border-border bg-surface shadow-2xl`)
  - Backed by the signature violet illuminated atmospheric halo
  - Displays realistic dashboard modules:
    - 3 Key Stat Cards: Penjualan Hari Ini (`Rp3.840.000`), Kas Masuk (`Rp2.420.000`), Transaksi Selesai (`30 Pesanan`)
    - Revenue Trend Chart with calm gradient fill
    - Live Cashier Activity Feed (real customer orders)
    - Bot Telegram status indicator (`Online · Terhubung`)

---

## 4. TYPOGRAPHY HIERARCHY
- **Font Family**: Geist Sans / Plus Jakarta Sans (Clean, friendly neo-grotesk / geometric sans).
- **Hero Title**: `text-4xl sm:text-5xl lg:text-6xl` (56–64px desktop), `font-bold tracking-tight text-foreground`.
- **Hero Secondary Line**: `text-muted` or matching display with softer weight.
- **Section Titles**: `text-3xl sm:text-4xl` (36–44px desktop), `font-bold tracking-tight`.
- **Body Copy**: `text-sm sm:text-base` (15–16px), line-height 1.6, `text-muted`.
- **Numbers / Currencies**: `tabular-nums` for alignment without terminal-style slashed zeros.
- **Monospace Usage**: Monospace (`font-mono`) is strictly restricted to small technical identifiers, Telegram bot commands, or timestamps. Major marketing copy is never monospace.

---

## 5. ICON SYSTEM
- **Family**: `lucide-react` (uniform 1.5–1.75px line stroke).
- **Style**: Monochrome or subtly tinted with `text-primary` or `text-muted`.
- **Forbidden**: Emojis, AI sparkle wands, glossy 3D cartoon icons, multi-colored rounded square containers.

---

## 6. COLOR SYSTEM
- **Canvas / Background**: Light `#F8FAFC`, Dark `#09090B`.
- **Surfaces**: Light `#FFFFFF`, Dark `#121215`.
- **Borders & Dividers**: Light `#E4E4E7`, Dark `#27272A`.
- **Primary Brand Accent**: Violet `#7C3AED` / `#8B5CF6`. Used with restraint for buttons, active accents, and the atmospheric radial glow.
- **Semantic Green**: `#10B981` strictly for positive states (connected, active, money received).

---

## 7. COMPONENT RHYTHM & ORDER
1. **Restrained Navbar**: Brand + plain text links (Fitur, Cara Kerja, Integrasi, Harga, FAQ) + ThemeToggle + Masuk + Mulai Gratis.
2. **Hero + Elevated Product Showcase**: Centered headline + short copy + 2 CTAs + large glowing dashboard mockup.
3. **Ecosystem Strip**: "Terhubung dengan sistem kerja harian Anda" (Telegram, Google Sheets, Web Dashboard, WhatsApp).
4. **4 Large Alternating Feature Showcases**:
   - Feature 1 (Text Left / Telegram Chat Mockup Right): *Catat penjualan secepat mengirim pesan chat.*
   - Feature 2 (Dashboard Analytics Mockup Left / Text Right): *Pantau omzet dan arus kas dari satu dashboard.*
   - Feature 3 (Text Left / Catalog & Stock Table Right): *Stok barang dan harga jual selalu sinkron.*
   - Feature 4 (Google Sheets Preview Left / Text Right): *Laporan terekap otomatis ke spreadsheet Anda.*
5. **4-Box Capability Grid**: Multi-Kasir, Tahan Sinyal Lemah, Rekonsiliasi Otomatis, Keamanan Data Terisolasi.
6. **How It Works Timeline**: 3 simple steps to get started in 2 minutes.
7. **Transparent Pricing**: Authoritative plans (Pilot Rp0, Basic Rp49k, Pro Rp149k) with clean tier cards and feature checklists.
8. **Editorial FAQ**: Clean divided accordions with friendly operational explanations.
9. **Final Compelling CTA Box**: Styled container with atmospheric visual backing.
10. **Compact Footer**: Clean real links and copyright notice.

---

## 8. MOTION & INTERACTIONS
- Subtle fade-in / slide-up for hero elements.
- Gentle parallax or hover elevation on the product showcase frame.
- Smooth accordion expand/collapse on FAQ items.
- Strict `@media (prefers-reduced-motion: reduce)` support with immediate static rendering.

---

## 9. MOBILE EXPERIENCE
- Tested at 360px, 390px, 430px, and 768px.
- Product showcase scales down smoothly within viewport without horizontal overflow.
- Alternating feature blocks stack naturally (Text on top, Visual below).
- Clean hamburger drawer for navigation.
- Generous tap targets (>= 44px).

---

## 10. STRICT ANTI-AI-SLOP & ANTI-DEVTOOL CHECKLIST
- ❌ NO debit/credit accounting journal entries in the marketing hero.
- ❌ NO SQL, PostgreSQL, ACID, or RLS jargon in hero headlines.
- ❌ NO developer console or terminal simulator.
- ❌ NO numbered navigation (`01`, `02`, `03`).
- ❌ NO generic 6-card bento grid spam.
- ❌ NO AI sparkle stars or magic wands.
- ❌ NO fake customer logos or fabricated reviews.
- ❌ NO purple-pink nebula gradient meshes.
- ✅ Approachable, confident, visually stunning, UMKM-friendly SaaS product design.
