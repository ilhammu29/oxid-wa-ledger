export type GoogleSheetsSyncStatus = "never" | "pending" | "syncing" | "success" | "failed";

export interface GoogleSheetsConnection {
  businessId: string;
  enabled: boolean;
  spreadsheetId: string | null;
  spreadsheetTitle: string | null;
  syncIntervalMinutes: number;
  lastSyncAt: string | null;
  lastSyncStatus: GoogleSheetsSyncStatus;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export type QueueJobStatus = "pending" | "processing" | "completed" | "failed";

export interface GoogleSheetsQueueJob {
  id: string;
  businessId: string;
  reason: string;
  status: QueueJobStatus;
  attemptCount: number;
  availableAt: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  errorCode: string | null;
}

export interface GoogleSheetsSyncRunSummary {
  id?: string;
  businessId: string;
  startedAt: string;
  finishedAt: string;
  status: "success" | "failed" | "partial";
  rowsTransactions: number;
  rowsProducts: number;
  rowsDailyStatus: number;
  errorCode?: string | null;
  errorMessage?: string | null;
}

export type GoogleApiErrorCode =
  | "GOOGLE_AUTH_ERROR"
  | "SPREADSHEET_NOT_FOUND"
  | "PERMISSION_DENIED"
  | "GOOGLE_API_UNAVAILABLE"
  | "RATE_LIMIT_EXCEEDED"
  | "NETWORK_TIMEOUT"
  | "INVALID_SPREADSHEET_ID"
  | "UNKNOWN_ERROR";

export interface GoogleSheetsConnectionTestResult {
  success: boolean;
  spreadsheetTitle?: string;
  errorCode?: GoogleApiErrorCode;
  errorMessage?: string;
}
