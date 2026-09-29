/**
 * Quantity and Unit Extractor for OXID WA Ledger.
 * Step 3: Exact decimal extraction for arbitrary weights.
 */

import { ExtractedQuantity } from "./types";

/**
 * Regex matching numbers followed by weight units in normalized text.
 * Matches: "15 kg", "2.5 kg", "150.25 kilo", "7 kilogram", etc.
 */
const QUANTITY_PATTERN = /(?:^|\s)(-?\d+(?:\.\d+)?)\s*(kg|kilo(?:gram)?)\b/g;

/**
 * Formats a clean decimal string to exactly 3 decimal places without binary float inaccuracies.
 * Suitable for direct storage in PostgreSQL NUMERIC(12, 3).
 *
 * Examples:
 * "15" -> "15.000"
 * "2.5" -> "2.500"
 * "150.25" -> "150.250"
 * "2.750" -> "2.750"
 */
export function formatToDbNumeric(rawNumStr: string): string {
  const parts = rawNumStr.split(".");
  const intPart = parts[0] || "0";
  const decPart = parts[1] || "";

  if (decPart.length <= 3) {
    const padded = (decPart + "000").slice(0, 3);
    return `${intPart}.${padded}`;
  }

  // If more than 3 decimal places, round the 4th digit
  const first3 = decPart.slice(0, 3);
  const fourth = parseInt(decPart[3], 10);
  let intNum = BigInt(intPart);
  let decNum = parseInt(first3, 10);

  if (fourth >= 5) {
    decNum += 1;
    if (decNum >= 1000) {
      intNum += BigInt(1);
      decNum = 0;
    }
  }

  return `${intNum.toString()}.${decNum.toString().padStart(3, "0")}`;
}

export interface QuantityExtractionResult {
  /** Primary quantity extracted (if single) or null */
  primaryQuantity: ExtractedQuantity | null;
  /** All quantities found in the message */
  allQuantities: ExtractedQuantity[];
  /** Flag indicating if multiple distinct quantities were found */
  hasMultipleQuantities: boolean;
  /** Flag indicating if zero or negative quantities were detected and rejected */
  hasInvalidNonPositiveQuantity: boolean;
}

/**
 * Extracts arbitrary weight quantities from normalized text.
 * Rejects zero, negative, or malformed quantities.
 */
export function extractQuantities(normalizedText: string): QuantityExtractionResult {
  const allQuantities: ExtractedQuantity[] = [];
  const regex = new RegExp(QUANTITY_PATTERN.source, "g");
  let match: RegExpExecArray | null;
  let hasInvalidNonPositiveQuantity = false;

  while ((match = regex.exec(normalizedText)) !== null) {
    const rawNumberStr = match[1];
    const rawNumber = parseFloat(rawNumberStr);

    // Reject 0 or negative quantities
    if (isNaN(rawNumber) || rawNumber <= 0) {
      hasInvalidNonPositiveQuantity = true;
      continue;
    }

    const decimalString = formatToDbNumeric(rawNumberStr);

    allQuantities.push({
      decimalString,
      rawNumber,
      unit: "kg",
      matchedText: match[0],
    });
  }

  const hasMultipleQuantities = allQuantities.length > 1;
  const primaryQuantity = allQuantities.length > 0 ? allQuantities[0] : null;

  return {
    primaryQuantity,
    allQuantities,
    hasMultipleQuantities,
    hasInvalidNonPositiveQuantity,
  };
}
