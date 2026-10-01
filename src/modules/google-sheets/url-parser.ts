/**
 * Parses and strictly validates a Google Spreadsheet ID or URL.
 * Protects against Server-Side Request Forgery (SSRF) and malformed inputs.
 */
export interface ParseSpreadsheetIdResult {
  success: boolean;
  spreadsheetId?: string;
  error?: string;
}

export const RAW_ID_REGEX = /^[a-zA-Z0-9-_]{20,100}$/;

export function isValidSpreadsheetId(id: string | null | undefined): boolean {
  if (!id || typeof id !== "string") return false;
  return RAW_ID_REGEX.test(id.trim());
}

export function parseSpreadsheetId(input: string | null | undefined): ParseSpreadsheetIdResult {
  if (!input || typeof input !== "string") {
    return {
      success: false,
      error: "Input URL atau Spreadsheet ID tidak boleh kosong.",
    };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return {
      success: false,
      error: "Input URL atau Spreadsheet ID tidak boleh kosong.",
    };
  }

  // 1. Direct raw ID matching
  if (RAW_ID_REGEX.test(trimmed)) {
    return {
      success: true,
      spreadsheetId: trimmed,
    };
  }

  // 2. Parse as URL
  try {
    const url = new URL(trimmed);

    // SSRF Guard: Strictly allow only docs.google.com
    if (url.hostname !== "docs.google.com") {
      return {
        success: false,
        error: "URL harus berasal dari domain resmi Google Sheets (docs.google.com).",
      };
    }

    // Google Sheets pathname pattern: /spreadsheets/d/<SPREADSHEET_ID>/...
    const match = url.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match || !match[1]) {
      return {
        success: false,
        error: "Format URL Google Sheets tidak valid. Harus mengandung /spreadsheets/d/<ID>.",
      };
    }

    const candidateId = match[1];
    if (!RAW_ID_REGEX.test(candidateId)) {
      return {
        success: false,
        error: "Spreadsheet ID yang diekstrak dari URL memiliki format tidak valid.",
      };
    }

    return {
      success: true,
      spreadsheetId: candidateId,
    };
  } catch {
    return {
      success: false,
      error: "URL atau Spreadsheet ID tidak valid. Periksa kembali tautan yang dimasukkan.",
    };
  }
}
