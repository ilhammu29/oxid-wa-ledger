/**
 * Administrative display utilities for IDs, emails, and strings.
 * Ensures long UUIDs and technical strings do not overflow mobile screens or tables.
 */

/**
 * Shortens a 36-character UUID to a compact readable format (e.g. "b4705941…a389d").
 * Returns the original string if length is 16 characters or less.
 */
export function formatShortId(id: string | null | undefined, head = 8, tail = 6): string {
  if (!id) return "-";
  if (id.length <= head + tail + 2) return id;
  return `${id.slice(0, head)}…${id.slice(-tail)}`;
}

/**
 * Safely bounds email display for tight spaces while retaining copyable/hoverable integrity.
 */
export function formatTruncatedEmail(email: string | null | undefined, maxChars = 24): string {
  if (!email) return "-";
  if (email.length <= maxChars) return email;
  return `${email.slice(0, maxChars - 3)}…`;
}
