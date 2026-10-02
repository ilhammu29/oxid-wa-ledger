# Design System Master File — OXID Ledger

> **LOGIC:** When building a specific page, first check `design-system/oxid-ledger/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** OXID Ledger  
**Classification:** Indonesian B2B Micro-SaaS / Financial Ledger / Operational Software  
**Design Dials:** Variance 8/10 (Bold / Asymmetric) | Motion 4/10 (Standard / Purposeful) | Density 6/10 (Standard / Scannable)  
**Primary Aesthetic Philosophy:** Swiss Precision & Ruled Financial Ledger (Anti-AI-Slop)  

---

## 1. Core Visual Principles

1. **Deterministic, Structured, Reliable**: OXID Ledger is not an AI playground, not crypto, and not a developer toy. It is an operational sales ledger for real Indonesian businesses (UMKM, food stalls, distributors, fish farmers, retailers).
2. **The Ledger is the Hero**: The core product concept—converting informal chat messages into bulletproof double-entry accounting records—drives the visual hierarchy.
3. **Restrained Palette, Decisive Accents**: A calm foundation of graphite, crisp light surfaces, and deep dark neutrals. Violet is preserved as a disciplined signature brand marker, while emerald green is strictly restricted to semantic success (reconciled, verified, active).
4. **Ruled Hierarchy over Floating Cards**: Replace generic rounded "card spam" with ruled ledger dividers, numbered sequence rails, hairline borders, and data rows.

---

## 2. Color System

| Role | Light Mode Hex | Dark Mode Hex | CSS Variable | Semantic Usage |
|------|---------------|---------------|--------------|----------------|
| **Background** | `#F8FAFC` | `#09090B` | `--background` | Main page canvas |
| **Foreground** | `#09090B` | `#FAFAFA` | `--foreground` | Primary text and headings |
| **Surface** | `#FFFFFF` | `#121215` | `--surface` | Panels, data cards, rows |
| **Surface Hover** | `#F4F4F5` | `#18181B` | `--surface-hover` | Hover states, secondary pills |
| **Border** | `#E4E4E7` | `#27272A` | `--border` | Ruled ledger lines, hairline dividers |
| **Border Subtle** | `#F4F4F5` | `#1E1E24` | `--border-subtle` | Secondary separators |
| **Muted** | `#71717A` | `#A1A1AA` | `--muted` | Secondary descriptions, labels |
| **Primary (Brand)** | `#7C3AED` | `#8B5CF6` | `--primary` | Signature brand accents, primary buttons |
| **Primary Hover** | `#6D28D9` | `#7C3AED` | `--primary-hover` | Button hover states |
| **Primary Subtle** | `#F5F3FF` | `rgba(139, 92, 246, 0.12)` | `--primary-subtle` | Active step background, badges |
| **Primary FG** | `#FFFFFF` | `#FFFFFF` | `--primary-fg` | Text on primary button |
| **Success (Semantic)**| `#10B981` | `#10B981` | `--color-success` | Only for verified, recorded, connected |
| **Success Subtle** | `#ECFDF5` | `rgba(16, 185, 129, 0.12)`| `--color-success-subtle`| Success badges, reconciled rows |
| **Destructive** | `#EF4444` | `#F87171` | `--color-destructive`| Errors, cancellations, warnings |

### Color Rules:
- **No purple-pink AI gradients**: No rainbow glows, no cosmic nebulae, no blurry background blobs.
- **Strictly semantic green**: Never use emerald green as a primary marketing color; green indicates money received, transaction recorded, or bot connected.
- **High-contrast readability**: All body text meets WCAG AAA standards (minimum 4.5:1 for body, 7:1 for critical numbers).

---

## 3. Typography System

| Role | Font Family | Weight | Letter Spacing | Purpose |
|------|-------------|--------|----------------|---------|
| **Display / Headings** | Plus Jakarta Sans / Space Grotesk | 700 / 800 | `-0.03em` (Tight) | Strong editorial headlines, section titles |
| **Body & UI** | Plus Jakarta Sans / Geist | 400 / 500 / 600 | `-0.01em` | Explanatory copy, form controls, button labels |
| **Data / Numbers** | Tabular Numerals (Geist / Inter) | 600 / 700 | `-0.02em` | Financial metrics, prices, transaction amounts |
| **Technical / Meta** | JetBrains Mono / Geist Mono | 500 | `+0.02em` | Transaction IDs, timestamps, `/commands`, units |

### Typography Rules:
- **No all-caps screaming**: Use sentence case for labels and descriptions.
- **Tabular figures mandatory**: Use `font-variant-numeric: tabular-nums` for all financial numbers (`Rp140.000`, `5 kg`).
- **No developer mono for human copy**: Monospace is reserved exclusively for codes, commands, and ledger timestamps.

---

## 4. Radius & Border Philosophy

- **Small controls & tags**: `rounded-md` / `rounded-lg` (6–8px)
- **Surfaces, panels, & cards**: `rounded-xl` (10–12px)
- **Outer product frames & modals**: `rounded-2xl` (14–16px)
- **Prohibited**: Blanket `rounded-3xl` (24–32px) on standard cards (creates generic toy-like bubbly aesthetics).
- **Ruled dividers**: Clean `1px solid var(--border)` hairlines rather than heavy drop shadows.

---

## 5. Icon System

- **Standard Library**: `Lucide` (consistent line icons, 1.5–1.75px stroke width).
- **Semantic Roles**:
  - `Receipt`, `FileSpreadsheet`: Ledger and transaction data.
  - `Bot`, `Send`, `MessageSquare`: Conversational channel operations.
  - `Check`, `CheckCircle2`: Reconciled / confirmed states.
  - `ArrowUpRight`, `ArrowRight`: Directional navigation and flow progression.
  - `ShieldCheck`, `Scale`, `Coins`: Business safeguards, inventory units, and currency.
- **Icon Rules**:
  - **No emojis as icons**.
  - **No magic wand or sparkle icons** (OXID Ledger is an operational accounting engine, not a generative AI gimmick).
  - Icons do **NOT** all sit in identical colored square badges; use bare monochrome line icons or subtle tinted pill chips.

---

## 6. Motion & Animation

- **Hover Microinteractions**: 150–250ms duration with `ease-out`. Subtle scale (1.005–1.01) or border color transition.
- **Workflow Steppers**: Sequential step reveals for transaction flows (chat → parse → ledger → sheets).
- **Reduced Motion Support**: Strictly honour `prefers-reduced-motion: reduce`. Immediately render static completed states without transitions.
- **Prohibited**: Floating cards orbiting around heroes, dizzy 3D canvas tilts, or slow looping floating elements.

---

## 7. Anti-AI-Slop Pre-Delivery Checklist

- [ ] No giant centered hero with pill badge + two buttons + giant static screenshot.
- [ ] No bento grid full of generic 6 identical feature cards.
- [ ] No fake testimonials, fake client logos, or fabricated metrics.
- [ ] No purple-pink AI nebula gradients.
- [ ] Real transaction workflow demonstrated (chat input → parsed entities → ledger posting → sheets mirror).
- [ ] Full Dark Mode and Light Mode support with high contrast.
- [ ] Tested responsive across 360px, 390px, 430px, 768px, 1024px, 1440px.
