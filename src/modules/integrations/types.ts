export type IntegrationType = "google_sheets" | "webhook";
export type SyncStatus = "idle" | "in_progress" | "success" | "error";

export interface Integration {
  id: string;
  businessId: string; // Tenant boundary
  type: IntegrationType;
  isEnabled: boolean;
  config: {
    sheetId?: string;
    sheetName?: string;
    webhookUrl?: string;
    [key: string]: unknown;
  };
  lastSyncAt?: string;
  syncStatus: SyncStatus;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConfigureIntegrationDTO {
  businessId: string;
  type: IntegrationType;
  isEnabled: boolean;
  config: Record<string, unknown>;
}
