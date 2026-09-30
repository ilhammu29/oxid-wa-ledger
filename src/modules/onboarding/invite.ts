import { SupabaseClient } from "@supabase/supabase-js";
import * as crypto from "crypto";

export function hashInviteToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
}

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export interface CreateInviteResult {
  success: boolean;
  token?: string;
  inviteUrl?: string;
  expiresAt?: string;
  error?: string;
}

/**
 * Creates an onboarding invite.
 * The plaintext token is NEVER stored in the database, only the SHA-256 hash.
 */
export async function createClientInvite(
  client: SupabaseClient,
  params: {
    email: string;
    createdBy: string;
    expiresInDays?: number;
    baseUrl?: string;
  }
): Promise<CreateInviteResult> {
  const email = params.email.trim().toLowerCase();
  const rawToken = generateSecureToken();
  const tokenHash = hashInviteToken(rawToken);
  const days = params.expiresInDays || 7;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await client
    .from("client_onboarding_invites")
    .insert({
      email,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_by: params.createdBy,
      active: true,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  const baseUrl = params.baseUrl || "https://oxid-wa-ledger.vercel.app";
  const inviteUrl = `${baseUrl}/onboarding?token=${rawToken}`;

  return {
    success: true,
    token: rawToken,
    inviteUrl,
    expiresAt,
  };
}

export interface ValidateInviteResult {
  valid: boolean;
  reason?: "NOT_FOUND" | "INACTIVE" | "EXPIRED" | "ALREADY_USED" | "EMAIL_MISMATCH";
  email?: string;
  expiresAt?: string;
}

/**
 * Validates that an invite token is active, unexpired, unused, and matches the authenticated user's email.
 */
export async function validateInviteToken(
  client: SupabaseClient,
  rawToken: string,
  userEmail?: string
): Promise<ValidateInviteResult> {
  if (!rawToken || typeof rawToken !== "string") {
    return { valid: false, reason: "NOT_FOUND" };
  }

  const tokenHash = hashInviteToken(rawToken);

  const { data, error } = await client
    .from("client_onboarding_invites")
    .select("*")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !data) {
    return { valid: false, reason: "NOT_FOUND" };
  }

  if (!data.active) {
    return { valid: false, reason: "INACTIVE" };
  }

  if (data.used_at) {
    return { valid: false, reason: "ALREADY_USED" };
  }

  if (new Date(data.expires_at) < new Date()) {
    return { valid: false, reason: "EXPIRED" };
  }

  if (userEmail && data.email.toLowerCase() !== userEmail.trim().toLowerCase()) {
    return { valid: false, reason: "EMAIL_MISMATCH" };
  }

  return {
    valid: true,
    email: data.email,
    expiresAt: data.expires_at,
  };
}
