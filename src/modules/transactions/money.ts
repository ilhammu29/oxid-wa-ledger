/**
 * Exact Money & Quantity Calculation Utilities for OXID WA Ledger.
 * Step 4: Fixed-point thousandths math matching PostgreSQL check constraints.
 */

/**
 * Parses an arbitrary decimal quantity string or number into fixed-point thousandths.
 * e.g. "15" -> 15000n, "2.500" -> 2500n, "150.25" -> 150250n.
 */
export function parseQuantityToThousandths(quantity: string | number): bigint {
  const str = typeof quantity === "number" ? quantity.toFixed(3) : quantity.trim();
  const isNegative = str.startsWith("-");
  const cleanStr = str.replace(/^[+-]/, "");
  const parts = cleanStr.split(".");
  const intPart = parts[0] || "0";
  const decPart = parts[1] || "";

  // Pad or slice to exactly 3 decimal digits
  const paddedDec = (decPart + "000").slice(0, 3);
  const thousandths = BigInt(intPart) * BigInt(1000) + BigInt(paddedDec);

  return isNegative ? -thousandths : thousandths;
}

/**
 * Calculates total financial amount using integer-safe fixed-point thousandths arithmetic.
 * Matches PostgreSQL formula: round(quantity * unit_price)::BIGINT.
 *
 * Math:
 * total = round((quantity_thousandths * unit_price) / 1000)
 * For non-negative integers: round(A / B) = (A + B / 2) / B.
 */
export function calculateTotalAmount(
  quantity: string | number,
  unitPrice: number | bigint
): bigint {
  const thousandths = parseQuantityToThousandths(quantity);
  const price = BigInt(unitPrice);

  if (thousandths < BigInt(0) || price < BigInt(0)) {
    throw new Error("Quantity and unit price must be non-negative");
  }

  const numerator = thousandths * price;
  // Integer rounding: (numerator + 500) / 1000
  const rounded = (numerator + BigInt(500)) / BigInt(1000);
  return rounded;
}

/**
 * Formats an integer IDR currency amount into Indonesian currency notation (e.g. "Rp420.000").
 */
export function formatRupiah(amount: number | bigint): string {
  const num = typeof amount === "bigint" ? Number(amount) : amount;
  return `Rp${new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(num)}`;
}

/**
 * Masks a telephone number for privacy in logs and UI (e.g. "+628123456789" -> "+62812****6789").
 */
export function maskPhoneNumber(phone?: string | null): string {
  if (!phone || phone.length < 8) {
    return phone ?? "";
  }
  const prefix = phone.slice(0, 5);
  const suffix = phone.slice(-4);
  return `${prefix}****${suffix}`;
}
