export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string;
          name: string;
          slug: string;
          currency: string;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          currency?: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          currency?: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      business_users: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          role: "owner" | "admin" | "member";
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id: string;
          role?: "owner" | "admin" | "member";
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          user_id?: string;
          role?: "owner" | "admin" | "member";
          created_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          code: string | null;
          aliases: string[];
          unit: string;
          default_price_idr: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          code?: string | null;
          aliases?: string[];
          unit: string;
          default_price_idr: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          code?: string | null;
          aliases?: string[];
          unit?: string;
          default_price_idr?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      whatsapp_connections: {
        Row: {
          id: string;
          business_id: string;
          phone_number_id: string;
          phone_number: string;
          display_name: string | null;
          provider: "meta_cloud_api" | "baileys" | "waba";
          status: "connected" | "disconnected" | "pending_verification" | "rate_limited";
          webhook_verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          phone_number_id: string;
          phone_number: string;
          display_name?: string | null;
          provider?: "meta_cloud_api" | "baileys" | "waba";
          status?: "connected" | "disconnected" | "pending_verification" | "rate_limited";
          webhook_verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          phone_number_id?: string;
          phone_number?: string;
          display_name?: string | null;
          provider?: "meta_cloud_api" | "baileys" | "waba";
          status?: "connected" | "disconnected" | "pending_verification" | "rate_limited";
          webhook_verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          business_id: string;
          whatsapp_connection_id: string | null;
          source: "whatsapp" | "manual" | "api";
          status: "pending" | "confirmed" | "cancelled";
          customer_identifier: string | null;
          raw_message: string | null;
          total_amount_idr: number;
          notes: string | null;
          recorded_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          whatsapp_connection_id?: string | null;
          source?: "whatsapp" | "manual" | "api";
          status?: "pending" | "confirmed" | "cancelled";
          customer_identifier?: string | null;
          raw_message?: string | null;
          total_amount_idr: number;
          notes?: string | null;
          recorded_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          whatsapp_connection_id?: string | null;
          source?: "whatsapp" | "manual" | "api";
          status?: "pending" | "confirmed" | "cancelled";
          customer_identifier?: string | null;
          raw_message?: string | null;
          total_amount_idr?: number;
          notes?: string | null;
          recorded_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      transaction_items: {
        Row: {
          id: string;
          transaction_id: string;
          product_id: string | null;
          product_name: string;
          quantity: number;
          unit: string;
          unit_price_idr: number;
          total_price_idr: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          product_id?: string | null;
          product_name: string;
          quantity: number;
          unit: string;
          unit_price_idr: number;
          total_price_idr: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          transaction_id?: string;
          product_id?: string | null;
          product_name?: string;
          quantity?: number;
          unit?: string;
          unit_price_idr?: number;
          total_price_idr?: number;
          created_at?: string;
        };
      };
      settings: {
        Row: {
          business_id: string;
          auto_reply_whatsapp: boolean;
          default_currency: string;
          default_timezone: string;
          reply_template_confirmed: string | null;
          reply_template_clarification: string | null;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          auto_reply_whatsapp?: boolean;
          default_currency?: string;
          default_timezone?: string;
          reply_template_confirmed?: string | null;
          reply_template_clarification?: string | null;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          auto_reply_whatsapp?: boolean;
          default_currency?: string;
          default_timezone?: string;
          reply_template_confirmed?: string | null;
          reply_template_clarification?: string | null;
          updated_at?: string;
        };
      };
      integrations: {
        Row: {
          id: string;
          business_id: string;
          type: "google_sheets" | "webhook";
          is_enabled: boolean;
          config: Json;
          last_sync_at: string | null;
          sync_status: "idle" | "in_progress" | "success" | "error";
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          type: "google_sheets" | "webhook";
          is_enabled?: boolean;
          config?: Json;
          last_sync_at?: string | null;
          sync_status?: "idle" | "in_progress" | "success" | "error";
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          type?: "google_sheets" | "webhook";
          is_enabled?: boolean;
          config?: Json;
          last_sync_at?: string | null;
          sync_status?: "idle" | "in_progress" | "success" | "error";
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
