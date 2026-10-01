import * as crypto from "crypto";
import { GoogleApiErrorCode, GoogleSheetsConnectionTestResult } from "./types";

export const MANAGED_SHEET_NAMES = [
  "Dashboard",
  "Transactions",
  "Products",
  "Daily_Status",
  "Config",
] as const;

export type ManagedSheetName = (typeof MANAGED_SHEET_NAMES)[number];

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cachedAuthToken: CachedToken | null = null;

export interface GoogleSheetsClientConfig {
  serviceAccountEmail?: string;
  privateKey?: string;
  fetchFn?: typeof fetch;
}

function getCredentials(config?: GoogleSheetsClientConfig) {
  const email = config?.serviceAccountEmail || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let key = config?.privateKey || process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!email || !key) {
    return null;
  }

  // Handle literal escaped newlines common in environment variables
  if (key.includes("\\n")) {
    key = key.replace(/\\n/g, "\n");
  }

  return { email, key };
}

/**
 * Checks whether Google Service Account credentials are configured on server runtime.
 */
export function isGoogleSheetsConfigured(config?: GoogleSheetsClientConfig): boolean {
  return getCredentials(config) !== null;
}

/**
 * Gets a valid OAuth2 access token for Google Sheets API using service account JWT.
 */
export async function getGoogleAccessToken(config?: GoogleSheetsClientConfig): Promise<string> {
  const creds = getCredentials(config);
  if (!creds) {
    throw new GoogleClientError("GOOGLE_AUTH_ERROR", "Google Sheets belum dikonfigurasi pada server runtime.");
  }

  const now = Math.floor(Date.now() / 1000);
  if (cachedAuthToken && cachedAuthToken.expiresAt > now + 300) {
    return cachedAuthToken.token;
  }

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const claimSet = {
    iss: creds.email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString("base64url");
  const base64Claim = Buffer.from(JSON.stringify(claimSet)).toString("base64url");
  const unsignedToken = `${base64Header}.${base64Claim}`;

  let signature: string;
  try {
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(unsignedToken);
    signature = signer.sign(creds.key, "base64url");
  } catch (signErr: unknown) {
    const msg = signErr instanceof Error ? signErr.message : String(signErr);
    throw new GoogleClientError("GOOGLE_AUTH_ERROR", `Gagal memvalidasi Google Service Account Private Key: ${msg}`);
  }

  const signedJwt = `${unsignedToken}.${signature}`;
  const fetcher = config?.fetchFn || fetch;

  const res = await fetcher("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: signedJwt,
    }).toString(),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new GoogleClientError(
      "GOOGLE_AUTH_ERROR",
      `Otentikasi Google Service Account gagal (HTTP ${res.status}): ${errText.slice(0, 150)}`
    );
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedAuthToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in || 3600),
  };

  return data.access_token;
}

export class GoogleClientError extends Error {
  errorCode: GoogleApiErrorCode;
  httpStatus?: number;
  isRetryable: boolean;

  constructor(code: GoogleApiErrorCode, message: string, httpStatus?: number, isRetryable = false) {
    super(message);
    this.name = "GoogleClientError";
    this.errorCode = code;
    this.httpStatus = httpStatus;
    this.isRetryable = isRetryable;
  }
}

/**
 * Maps raw HTTP responses to sanitized GoogleClientError.
 */
function handleHttpError(status: number, responseBody: string): GoogleClientError {
  let message = `Google API returned HTTP ${status}`;
  try {
    const parsed = JSON.parse(responseBody);
    if (parsed.error?.message) {
      message = parsed.error.message;
    }
  } catch {
    // ignore parse error
  }

  if (status === 404) {
    return new GoogleClientError(
      "SPREADSHEET_NOT_FOUND",
      "Spreadsheet tidak ditemukan. Pastikan Spreadsheet ID benar dan tidak dihapus.",
      404,
      false
    );
  }

  if (status === 401) {
    return new GoogleClientError(
      "GOOGLE_AUTH_ERROR",
      "Autentikasi Google Service Account gagal. Periksa kembali konfigurasi email dan private key.",
      401,
      false
    );
  }

  if (status === 403) {
    return new GoogleClientError(
      "PERMISSION_DENIED",
      "Izin akses ditolak. Pastikan email Service Account telah ditambahkan sebagai Editor di spreadsheet ini.",
      403,
      false
    );
  }

  if (status === 429) {
    return new GoogleClientError(
      "RATE_LIMIT_EXCEEDED",
      "Batas kuota Google Sheets API tercapai. Sinkronisasi akan dicoba kembali secara otomatis.",
      429,
      true
    );
  }

  if (status >= 500) {
    return new GoogleClientError(
      "GOOGLE_API_UNAVAILABLE",
      "Layanan Google Sheets sementara tidak tersedia. Sinkronisasi akan dicoba kembali.",
      status,
      true
    );
  }

  return new GoogleClientError("UNKNOWN_ERROR", message.slice(0, 200), status, false);
}

/**
 * Fetches basic spreadsheet metadata: title and existing sheets.
 */
export async function getSpreadsheetMetadata(
  spreadsheetId: string,
  config?: GoogleSheetsClientConfig
): Promise<{ title: string; sheets: Array<{ id: number; title: string }> }> {
  const token = await getGoogleAccessToken(config);
  const fetcher = config?.fetchFn || fetch;

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}?fields=properties.title,sheets.properties(sheetId,title)`;

  const res = await fetcher(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw handleHttpError(res.status, body);
  }

  const data = (await res.json()) as {
    properties: { title: string };
    sheets: Array<{ properties: { sheetId: number; title: string } }>;
  };

  return {
    title: data.properties?.title || "Spreadsheet Tanpa Judul",
    sheets: (data.sheets || []).map((s) => ({
      id: s.properties?.sheetId ?? 0,
      title: s.properties?.title || "",
    })),
  };
}

/**
 * Tests connection to a spreadsheet, verifying existence and editor permissions.
 */
export async function testSpreadsheetConnection(
  spreadsheetId: string,
  config?: GoogleSheetsClientConfig
): Promise<GoogleSheetsConnectionTestResult> {
  try {
    if (!isGoogleSheetsConfigured(config)) {
      return {
        success: false,
        errorCode: "GOOGLE_AUTH_ERROR",
        errorMessage: "Google Sheets belum dikonfigurasi pada server.",
      };
    }

    const meta = await getSpreadsheetMetadata(spreadsheetId, config);

    // Verify write access with a safe valid non-destructive updateSpreadsheetProperties setting the title to itself.
    // This validates write/Editor permission without modifying cells or altering spreadsheet structure.
    const token = await getGoogleAccessToken(config);
    const fetcher = config?.fetchFn || fetch;
    const testUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}:batchUpdate`;

    const writeCheckRes = await fetcher(testUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            updateSpreadsheetProperties: {
              properties: {
                title: meta.title,
              },
              fields: "title",
            },
          },
        ],
      }),
    });

    if (!writeCheckRes.ok) {
      const body = await writeCheckRes.text().catch(() => "");
      throw handleHttpError(writeCheckRes.status, body);
    }

    return {
      success: true,
      spreadsheetTitle: meta.title,
    };
  } catch (err: unknown) {
    if (err instanceof GoogleClientError) {
      return {
        success: false,
        errorCode: err.errorCode,
        errorMessage: err.message,
      };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      errorCode: "UNKNOWN_ERROR",
      errorMessage: msg.slice(0, 200),
    };
  }
}

/**
 * Ensures the 5 managed sheets exist in the spreadsheet.
 * If missing, creates them.
 * NEVER deletes or alters unrelated worksheets created by client.
 */
export async function ensureManagedWorksheets(
  spreadsheetId: string,
  config?: GoogleSheetsClientConfig
): Promise<void> {
  const meta = await getSpreadsheetMetadata(spreadsheetId, config);
  const existingTitles = new Set(meta.sheets.map((s) => s.title));

  const missingSheets = MANAGED_SHEET_NAMES.filter((name) => !existingTitles.has(name));
  if (missingSheets.length === 0) {
    return;
  }

  const token = await getGoogleAccessToken(config);
  const fetcher = config?.fetchFn || fetch;

  const requests = missingSheets.map((name) => ({
    addSheet: {
      properties: {
        title: name,
      },
    },
  }));

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}:batchUpdate`;

  const res = await fetcher(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requests }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw handleHttpError(res.status, body);
  }
}

import { SheetMatrix } from "./formatters";

/**
 * Synchronizes managed worksheets in bulk.
 * Clears old data in managed sheets and writes new data using RAW valueInputOption.
 * Formula Injection Protection: Strictly uses valueInputOption = 'RAW'.
 */
export async function writeManagedSheets(
  spreadsheetId: string,
  sheetsData: Partial<Record<ManagedSheetName, SheetMatrix>>,
  config?: GoogleSheetsClientConfig
): Promise<void> {
  const token = await getGoogleAccessToken(config);
  const fetcher = config?.fetchFn || fetch;

  // 1. Clear existing ranges in managed sheets (up to row 5000, cols A-Z)
  const clearRanges = Object.keys(sheetsData).map((sheetName) => `'${sheetName}'!A1:Z5000`);
  if (clearRanges.length > 0) {
    const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values:batchClear`;

    const clearRes = await fetcher(clearUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ranges: clearRanges }),
    });

    if (!clearRes.ok) {
      const body = await clearRes.text().catch(() => "");
      throw handleHttpError(clearRes.status, body);
    }
  }

  // 2. Batch update values with RAW input option
  const valueData = Object.entries(sheetsData).map(([sheetName, rows]) => ({
    range: `'${sheetName}'!A1`,
    values: rows,
  }));

  const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values:batchUpdate`;

  const writeRes = await fetcher(writeUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      valueInputOption: "RAW", // CRITICAL: Protects against formula injection
      data: valueData,
    }),
  });

  if (!writeRes.ok) {
    const body = await writeRes.text().catch(() => "");
    throw handleHttpError(writeRes.status, body);
  }
}
