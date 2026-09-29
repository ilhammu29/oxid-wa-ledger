/**
 * Indonesian text normalizer for OXID WA Ledger.
 * Step 3: Deterministic text cleaning, unit separation, and decimal conversion.
 */

export const MAX_INPUT_LENGTH = 500;

export interface NormalizationResult {
  /** Cleaned and standardized text */
  normalizedText: string;
  /** Whether the input was rejected or truncated due to excessive length */
  isLengthExceeded: boolean;
  /** Original raw string */
  originalText: string;
}

/**
 * Normalizes user input text into a canonical lowercase format suitable for deterministic parsing.
 *
 * Rules:
 * 1. Safe length bounding (max 500 characters) to prevent regex backtracking / memory abuse.
 * 2. Lowercase transformation.
 * 3. Separation of numbers and unit suffixes (e.g. "15KG" -> "15 kg", "15_kg" -> "15 kg", "15-kg" -> "15 kg").
 * 4. Indonesian decimal comma conversion (e.g. "2,5 kg" -> "2.5 kg", "150,25 kg" -> "150.25 kg").
 * 5. Unit standardizations (e.g. "kilogram", "kilo", "kg" separated properly).
 * 6. Collapse of whitespace and stripping of non-numeric punctuation.
 */
export function normalizeIndonesianText(rawInput: string): NormalizationResult {
  if (!rawInput || typeof rawInput !== "string") {
    return {
      normalizedText: "",
      isLengthExceeded: false,
      originalText: rawInput ?? "",
    };
  }

  const originalText = rawInput;
  const isLengthExceeded = originalText.length > MAX_INPUT_LENGTH;
  const boundedText = isLengthExceeded
    ? originalText.slice(0, MAX_INPUT_LENGTH)
    : originalText;

  // 1. Lowercase
  let text = boundedText.toLowerCase();

  // 2. Normalize common Indonesian colloquial contractions / typos
  // e.g. "kmaren" -> "kemarin", "batalin" -> "batal"
  text = text.replace(/\bbatalin\b/g, "batal");
  text = text.replace(/\bbatalkan\b/g, "batal");
  text = text.replace(/\bnggak\b/g, "gak");
  text = text.replace(/\bgaada\b/g, "gak ada");
  text = text.replace(/\bgakada\b/g, "gak ada");

  // 3. Normalize hyphens and underscores connecting digits and units
  // e.g. "15-kg" -> "15 kg", "15_kg" -> "15 kg", "15-kilo" -> "15 kilo"
  text = text.replace(/(\d+)[_\-]+(kg|kilo|kilogram)\b/gi, "$1 $2");

  // 4. Normalize attached digits and units
  // e.g. "15kg" -> "15 kg", "2.5kg" -> "2.5 kg", "2,5kg" -> "2,5 kg"
  text = text.replace(/(\d+)(kg|kilo|kilogram)\b/gi, "$1 $2");

  // 5. Convert Indonesian decimal comma (between digits) to decimal dot
  // e.g. "2,5" -> "2.5", "150,25" -> "150.25", "2,750" -> "2.750"
  text = text.replace(/(\d+),(\d+)/g, "$1.$2");

  // 6. Clean punctuation while preserving decimal dots and word characters
  // Replace characters like '?', '!', '"', ';', ':', '(', ')', '[', ']' with space
  text = text.replace(/[?!:;'"()[\]{}~`@#$%^&*+=<>/\\]/g, " ");

  // 7. Remove commas and underscores; remove hyphens unless immediately preceding a digit (negative numbers)
  text = text.replace(/[_,]/g, " ");
  text = text.replace(/-(?!\d)/g, " ");

  // 8. Normalize isolated dots (dots not surrounded by digits on both sides)
  // e.g. "hari ini." -> "hari ini ", but preserve "2.5"
  text = text.replace(/(?<!\d)\.|\.(?!\d)/g, " ");

  // 9. Collapse multiple whitespaces and trim
  text = text.replace(/\s+/g, " ").trim();

  return {
    normalizedText: text,
    isLengthExceeded,
    originalText,
  };
}
