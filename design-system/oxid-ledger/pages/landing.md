# Landing Page Design System & Art-Direction Specification — OXID Ledger

> **PRIMARY ART DIRECTION REFERENCE:** `https://ovo-redsun.webflow.io/` (RedSun Webflow)  
> **DESIGN ENGINE & VALIDATION:** UI UX Pro Max Skill (`search.py`, `styles.csv`, `typography.csv`, `landing.csv`, `ux-guidelines.csv`)  
> **CORE OBJECTIVE:** Rebuild the landing page art direction from the ground up, capturing the dark cinematic atmosphere, deliberate typography, glowing celestial arc, and scroll-driven product reveal of RedSun—while staying unmistakably OXID Ledger for Indonesian business owners.

---

## 1. REFERENCE ANALYSIS: RedSun Webflow

### Initial Hero (Scroll 0.00)
- **Topbar**: Dark, quiet, minimalist 56–64px navbar. Logo mark on left, clean plain text navigation centered with generous gap (40px), single refined demo CTA on right.
- **Atmosphere**: Deep near-black graphite canvas (`#08090C` / `#0C1218`) with calm ambient depth. No chaotic floating elements.
- **Copy Hierarchy**:
  - Small, restrained inline update tag ("Ease Update v0.1" / "Whats New").
  - Large headline with deliberate weight contrast (64px desktop), leading `1.1`.
  - Supporting copy: restrained to 2 lines, high-legibility muted tone.
  - CTAs: Dual action row with arrow glyphs. Primary has subtle halo illumination (`button-glow`); secondary has a clean hairline border (`button-simple`).

### Scroll Phase 1 (Scroll 0.00 → 0.25)
- Headline begins upward motion (`translateY: 0 → -50px`) and gradual fade (`opacity: 1 → 0.4`).
- Supporting copy and CTAs fade cleanly without lingering.
- Atmospheric visual arc emerges from the bottom center of the viewport.

### Scroll Phase 2 (Scroll 0.25 → 0.50)
- Arc scales up (`scale: 0.85 → 1.15`) and intensifies in opacity, becoming the dominant visual anchor.
- Ambient glow illuminates the upper hemisphere of the screen.

### Scroll Phase 3 (Scroll 0.50 → 0.75)
- Product dashboard mockup ascends from below the fold (`translateY: 120px → 0`, `scale: 0.94 → 1`, `opacity: 0 → 1`).
- The arc positions itself directly behind the top edge of the dashboard, creating a dramatic halo effect.

### Scroll Phase 4 (Scroll 0.75 → 1.00)
- The dashboard takes over as the primary viewport focal point.
- Hero text is completely gone, and the page flows naturally into the first editorial product story section.

---

## 2. UI UX PRO MAX RESEARCH & VALIDATION

### Domain Searches Performed
1. `B2B SaaS typography` (`typography.csv`): Recommended **Plus Jakarta Sans** and **Inter**. Highlighted Plus Jakarta Sans as the modern authoritative alternative with exceptional mobile scaling and heading-to-body balance.
2. `financial bookkeeping SaaS` (`styles.csv`): Matched **dimensional-layering** (Z-index depth, overlapping surfaces, subtle elevation, scroll parallax) and **glassmorphism** (frosted backdrop blur, hairline 1px borders, high contrast).
3. `product-demo-features` (`landing.csv`): Structural pattern: `Hero > Product Visual Showcase > Feature Breakdown Per Concept > Comparison/Pricing > CTA`.
4. `reduced-motion` (`ux-guidelines.csv`): Required media query `@media (prefers-reduced-motion: reduce)` to display final static positions without parallax or scroll-jacking.

---

## 3. TYPOGRAPHY SYSTEM EVALUATION & SELECTION

### Candidates Evaluated
1. **Candidate A: Plus Jakarta Sans** (Geometric Neo-Grotesk)
   - *Strengths*: Designed specifically by Tokotype for contemporary Indonesian clarity. High x-height, open counters, refined terminal curves, architectural authority at 56–64px (`font-semibold`/`font-bold`, tracking `-0.03em`), superb body readability, native `tabular-nums` support.
   - *Verdict*: **SELECTED as Primary Display & Body System**.
2. **Candidate B: DM Sans** (Geometric Humanist)
   - *Strengths*: Friendly, geometric, clean.
   - *Weaknesses*: Slightly looser counters and stylized letterforms (`a`, `t`) feel more consumer-lifestyle than financial ledger operations.
3. **Candidate C: Outfit + Work Sans** (Dual Family)
   - *Strengths*: Highly circular geometric headers.
   - *Weaknesses*: Two separate Google Font downloads introduce latency; Work Sans has slightly wider proportions that can create awkward line wrapping in Indonesian copy.

### Final Typographic Architecture
- **Display / Headings**: **Plus Jakarta Sans** (`font-semibold` / `font-bold`, tracking `-0.03em`, line-height `1.1`).
- **Body & Paragraphs**: **Plus Jakarta Sans** (`font-normal` / `font-medium`, 15–16px, line-height `1.6`, tracking `-0.01em`).
- **Financial / Tabular Data**: **Plus Jakarta Sans** with `tabular-nums` for crisp number columns without developer-console slashed zeros.
- **Technical Metadata / Code**: **Geist Mono** / `font-mono` strictly for timestamps, Telegram bot tokens, or webhook paths.

### Copy Wrapping Discipline
- No orphan words on lonely lines (e.g. eliminating `"rapi."` isolated on line 3).
- Deliberate manual line breaks (`<br className="hidden sm:inline" />`) designed for 1440px, 1024px, and mobile viewports.

---

## 4. COLOR & SURFACE SYSTEM

```css
--canvas-bg: #090a0f;       /* Deep space graphite */
--surface-base: #11131a;    /* Card and section surface */
--surface-hover: #181b24;   /* Interactive hover state */
--surface-border: #232734;  /* Hairline border */
--brand-primary: #7c3aed;   /* Electric OXID Violet */
--brand-glow: #6d28d9;      /* Atmospheric radial halo */
--brand-indigo: #4338ca;    /* Secondary celestial rim */
--text-primary: #f8fafc;    /* High contrast off-white */
--text-muted: #94a3b8;      /* Slate body gray */
--semantic-emerald: #10b981;/* Operational / connected status only */
```

---

## 5. HERO COMPOSITION & "LEDGER ORBIT" ARC

### Structure
```
[ Sticky Navbar (56px) - Brand Logo + Nav Links + Masuk + Mulai Gratis ]
                              ↓
                [ Hero Text Container (Pinned) ]
            Inline Update: "v2.5 · Integrasi Telegram Otomatis"
       Headline Line 1: "Catat penjualan." (font-semibold #F8FAFC)
   Headline Line 2: "Usaha tetap terkendali." (font-medium #94A3B8)
              Supporting Copy (1–2 lines, max-w-xl)
        CTAs: [ Mulai Gratis 14 Hari → ]  [ Lihat Cara Kerja ↓ ]
                              ↓
              [ Layer 2: "Ledger Orbit" Arc ]
     Curved elliptical glowing horizon rising from bottom-center
                              ↓
             [ Layer 3: OXID Dashboard Frame ]
   Cinematic glass frame showing Overview, Calm Trend, Live Feed
```

---

## 6. PARALLAX SCROLL CHOREOGRAPHY (160vh Scroll Stage)

Driven by a zero-dependency, RAF-throttled scroll progress engine (`0.00 → 1.00`):

| Scroll Progress | Headline & Copy | Ledger Orbit Arc | Dashboard Mockup |
| :--- | :--- | :--- | :--- |
| **0.00 – 0.20** | `opacity: 1`, `translateY: 0px` | `opacity: 0.6`, `scale: 0.85`, low | Below fold, `opacity: 0` |
| **0.20 – 0.45** | `opacity: 1 → 0.2`, `translateY: 0 → -60px` | `opacity: 0.6 → 1`, `scale: 0.85 → 1.15`, rising | `translateY: 140px → 40px`, `opacity: 0 → 0.6` |
| **0.45 – 0.75** | `opacity: 0`, pointer-events none | Peak presence, halo behind dashboard | `translateY: 40px → 0px`, `scale: 0.94 → 1`, `opacity: 1` |
| **0.75 – 1.00** | Faded completely | Settles as backdrop halo | Primary focus, transitions into Section 01 |

### Mobile Behavior (< 768px)
- No rigid sticky pin; natural scroll flow.
- Soft 20–30px upward translation on dashboard.
- Zero horizontal overflow.

### Accessibility (`prefers-reduced-motion: reduce`)
- All scroll transformations disabled.
- Headline, Arc, and Dashboard render in their static final state.

---

## 7. COMPONENT ANTI-AI-SLOP RULES & SECTION VOCABULARY

1. **NO Generic Centered Pill Badge**: Replaced with an integrated, restrained text badge.
2. **NO Six Identical Cards**: Every product capability uses an individual editorial composition:
   - **01 Telegram Chat**: Conversation rail with live cashier message & instant bot receipt.
   - **02 Dashboard Overview**: Clean product window showing real metric cards and revenue trend.
   - **03 Product & Inventory**: Structured price matrix and stock deduction row.
   - **04 Google Sheets**: Real spreadsheet grid preview with auto-sync indicator.
3. **NO Floating Arbitrary Badges**: Status indicators reside strictly inside the product mockups.
4. **NO Cartoon Emojis or Multi-Color Square Icon Boxes**: Monochrome `lucide-react` icons integrated contextually into copy.
5. **Editorial Pricing & FAQ**: Ruled accordions and comparison surface, matching financial clarity.

---

## 8. OFFICIAL OXID LOGO
- Integrated via `<BrandLogo size="md" showText />` derived from `ui ux image/logo_oxid.jpeg` (`public/brand/`).
- Seamless zero-JS light/dark compatibility.
