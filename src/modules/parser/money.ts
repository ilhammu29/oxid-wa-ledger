/**
 * Indonesian Natural Language Money & Amount Parser for OXID Ledger v2.
 * Deterministic parser for colloquial numbers, 'ribu', 'juta', 'k', and IDR currencies.
 */

export interface ParsedMoney {
  amount: number;
  matchedText: string;
}

/**
 * Parses natural Indonesian money phrases into exact integer IDR.
 * Examples:
 * - "150 ribu" / "150rb" / "150k" -> 150000
 * - "2 juta" / "2jt" -> 2000000
 * - "2,5 juta" / "2.5 jt" -> 2500000
 * - "Rp 150.000" / "150.000" -> 150000
 * - "50000" -> 50000
 */
export function extractMoneyAmount(text: string): ParsedMoney | null {
  if (!text) return null;
  const clean = text.toLowerCase().trim();

  // Pattern 1: Decimal with 'juta' or 'jt', e.g. "2,5 juta", "2.5 jt", "10 juta"
  const jtMatch = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:juta|jt)\b/);
  if (jtMatch) {
    const numStr = jtMatch[1].replace(",", ".");
    const val = Math.round(parseFloat(numStr) * 1_000_000);
    if (!isNaN(val) && val > 0) {
      return { amount: val, matchedText: jtMatch[0] };
    }
  }

  // Pattern 2: Decimal with 'ribu' or 'rb' or 'k', e.g. "150 ribu", "150rb", "50k", "2,5 ribu"
  const rbMatch = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:ribu|rb|k)\b/);
  if (rbMatch) {
    const numStr = rbMatch[1].replace(",", ".");
    const val = Math.round(parseFloat(numStr) * 1_000);
    if (!isNaN(val) && val > 0) {
      return { amount: val, matchedText: rbMatch[0] };
    }
  }

  // Pattern 3: Explicit Rp formatted, e.g. "rp 150.000", "rp150000"
  const rpMatch = clean.match(/(?:rp\.?|idr)\s*(\d{1,3}(?:\.\d{3})+|\d+)\b/);
  if (rpMatch) {
    const digitsOnly = rpMatch[1].replace(/\./g, "");
    const val = parseInt(digitsOnly, 10);
    if (!isNaN(val) && val > 0) {
      return { amount: val, matchedText: rpMatch[0] };
    }
  }

  // Pattern 4: Bare dot-separated thousands, e.g. "150.000" or "1.500.000"
  const dotThousandsMatch = clean.match(/\b(\d{1,3}(?:\.\d{3})+)\b/);
  if (dotThousandsMatch) {
    const digitsOnly = dotThousandsMatch[1].replace(/\./g, "");
    const val = parseInt(digitsOnly, 10);
    if (!isNaN(val) && val >= 1000) {
      return { amount: val, matchedText: dotThousandsMatch[0] };
    }
  }

  // Pattern 5: Bare large numbers, e.g. "50000", "150000" (at least 4 digits, not followed by kg/unit)
  const bareNumberMatch = clean.match(/\b(\d{4,9})\b(?!\s*(?:kg|kilo|gram|ons|ekor|karung|sak))/);
  if (bareNumberMatch) {
    const val = parseInt(bareNumberMatch[1], 10);
    if (!isNaN(val) && val >= 1000) {
      return { amount: val, matchedText: bareNumberMatch[0] };
    }
  }

  return null;
}
