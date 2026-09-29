# OXID WA Ledger — Deterministic Message Parser Specification (Step 3)

## 1. Overview
The **OXID WA Ledger Message Parser** is an in-memory, deterministic natural language engine for Indonesian business communications. It decodes conversational updates into structured actions without external API calls, AI/LLMs, or database dependencies.

The parser acts as a pure function:
```
raw input string → normalizer → intent detector → entity extractor → confidence evaluator → conversation action
```

---

## 2. Supported Intents

| Intent | Purpose | Examples |
|---|---|---|
| `SALE` | Record customer sales with positive quantity and unit | `Kejual 30kg`, `Ada pembeli 15kg`, `Tadi laku 2,5 kilo` |
| `REPORT_TODAY` | Daily sales and summary inquiry | `Laporan hari ini`, `Omzet hari ini`, `Hari ini dapat berapa` |
| `REPORT_WEEK` | Weekly sales and summary inquiry | `Laporan minggu ini`, `Minggu ini dapat berapa?` |
| `REPORT_MONTH` | Monthly sales and summary inquiry | `Laporan bulan ini`, `Bulan ini omzet berapa?` |
| `NO_SALE` | Explicit confirmation of zero sales during business day | `Gak ada penjualan hari ini`, `Hari ini tidak ada yang beli` |
| `CLOSED` | Confirmation of planned business holiday or closure | `Libur hari ini`, `Hari ini tutup`, `Gak jualan hari ini` |
| `CANCEL_LAST` | Request to cancel the most recent transaction | `Batal terakhir`, `Batalkan yang terakhir`, `Hapus transaksi terakhir` |
| `CORRECT_LAST` | Request to adjust the weight of the last transaction | `Ubah terakhir jadi 20kg`, `Koreksi terakhir jadi 2,5kg` |
| `HELP` | Instructions and supported message examples | `Help`, `Bantuan`, `Cara pakai`, `Bisa apa` |
| `UNKNOWN` | Unrecognized or unrelated message | `asdf`, `halo`, `ikan bagus` |

---

## 3. Normalization Rules

The normalizer [`normalizeIndonesianText`](file:///home/ilhammu29/oxid-wa-ledger/src/modules/parser/normalizer.ts) applies strict pre-processing:
1. **Length Guard**: Limits input to 500 characters to prevent regex Denial-of-Service (ReDoS) or memory exhaustion.
2. **Case Normalization**: Converts all text to lowercase.
3. **Unit Separation**:
   - Hyphens / underscores: `15-kg` → `15 kg`, `15_kg` → `15 kg`
   - Compact numbers and units: `15kg` → `15 kg`, `2.5kg` → `2.5 kg`, `2,5kg` → `2,5 kg`
4. **Indonesian Decimal Comma**: Converts `2,5` → `2.5`, `150,25` → `150.25`, `2,750` → `2.750`.
5. **Punctuation Filtering**: Strips characters like `?`, `!`, `"`, `;`, `:`, `(`, `)` while preserving decimal dots (`2.5`) and negative signs attached to numbers (`-5`).
6. **Whitespace Compression**: Trims leading/trailing whitespace and collapses repeated spaces to single spaces.

---

## 4. Quantity & Unit Extraction

- **Canonical Unit**: Normalized to `"kg"`.
- **Supported Units**: `kg`, `kilo`, `kilogram` (and case variations `KG`, `Kilo`, `Kilogram`).
- **Precision Storage**: Quantities are formatted into exact decimal strings formatted for PostgreSQL `NUMERIC(12, 3)` (e.g. `15.000`, `2.500`, `150.250`) without binary floating-point roundoff issues.
- **Validation**: Zero (`0 kg`) and negative numbers (`-5 kg`) are rejected.

---

## 5. Confidence & Confirmation System

| Level | Criteria | Example | Action |
|---|---|---|---|
| **HIGH** | Unambiguous sale keyword + valid single positive weight; or explicit command/report | `Kejual 30kg`<br>`Laporan hari ini` | `CREATE_SALE`<br>`SHOW_REPORT_TODAY` |
| **MEDIUM** | Sale keyword with uncertainty word, or multiple weights detected | `Kayaknya laku 10kg`<br>`Jual 10kg lalu 5kg` | `ASK_CONFIRMATION` |
| **LOW** | Bare weight without sale verb; or ambiguous phrase | `15kg`<br>`Sekitar 15kg` | `ASK_CONFIRMATION` |

### False Positive Protection (Stock Shield)
Messages containing inventory or stock terms (`stok`, `sisa`, `tersisa`, `persediaan`, `masih ada`, `tinggal`) are strictly prohibited from generating sales:
- `stok tinggal 15kg` → `UNKNOWN` (non-sale context)
- `kejual 10kg tapi stok masih ada` → `UNKNOWN` (conflict resolved conservatively)

---

## 6. Known Limitations & Scope Boundaries
- **No Multi-Sale Batching**: When multiple quantities appear (e.g. `jual 10kg lalu 5kg`), the MVP parser requires user confirmation rather than guessing customer intent.
- **No Pricing Calculation in Step 3**: Prices and revenue are intentionally handled by product catalog rules, not hardcoded into the parser.
- **Single Currency & Unit Domain**: The MVP is optimized for weight-based sales (`kg`). Additional units (`ekor`, `ikat`, `box`) can be registered as domain requirements evolve.
