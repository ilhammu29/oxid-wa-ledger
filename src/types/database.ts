
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "business_daily_status": {
                  Row: {
                    "business_id": string,"created_at": string,"id": string,"local_date": string,"note": string | null,"source": string,"status": string,"updated_at": string
                  }
                  Insert: {
                    "business_id": string,"created_at"?: string,"id"?: string,"local_date": string,"note"?: string | null,"source"?: string,"status": string,"updated_at"?: string
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"id"?: string,"local_date"?: string,"note"?: string | null,"source"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_daily_status_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"business_settings": {
                  Row: {
                    "business_id": string,"confirmation_mode": string,"created_at": string,"daily_report_enabled": boolean,"owner_display_name": string | null,"reminder_enabled": boolean,"reminder_local_time": string,"updated_at": string
                  }
                  Insert: {
                    "business_id": string,"confirmation_mode"?: string,"created_at"?: string,"daily_report_enabled"?: boolean,"owner_display_name"?: string | null,"reminder_enabled"?: boolean,"reminder_local_time"?: string,"updated_at"?: string
                  }
                  Update: {
                    "business_id"?: string,"confirmation_mode"?: string,"created_at"?: string,"daily_report_enabled"?: boolean,"owner_display_name"?: string | null,"reminder_enabled"?: boolean,"reminder_local_time"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_settings_business_id_fkey"
      columns: ["business_id"]
isOneToOne: true
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"business_users": {
                  Row: {
                    "business_id": string,"created_at": string,"role": string,"user_id": string
                  }
                  Insert: {
                    "business_id": string,"created_at"?: string,"role": string,"user_id": string
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"role"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_users_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"businesses": {
                  Row: {
                    "created_at": string,"created_by": string,"currency": string,"id": string,"name": string,"status": string,"timezone": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by": string,"currency"?: string,"id"?: string,"name": string,"status"?: string,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"currency"?: string,"id"?: string,"name"?: string,"status"?: string,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"notification_logs": {
                  Row: {
                    "business_id": string,"channel": string,"created_at": string,"error_code": string | null,"id": string,"local_date": string,"notification_type": string,"provider_message_id": string | null,"sent_at": string | null,"status": string
                  }
                  Insert: {
                    "business_id": string,"channel"?: string,"created_at"?: string,"error_code"?: string | null,"id"?: string,"local_date": string,"notification_type": string,"provider_message_id"?: string | null,"sent_at"?: string | null,"status": string
                  }
                  Update: {
                    "business_id"?: string,"channel"?: string,"created_at"?: string,"error_code"?: string | null,"id"?: string,"local_date"?: string,"notification_type"?: string,"provider_message_id"?: string | null,"sent_at"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_logs_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"processed_telegram_updates": {
                  Row: {
                    "business_id": string | null,"created_at": string,"error_message": string | null,"processed_at": string | null,"processing_status": string,"response_text": string | null,"telegram_user_id": number | null,"update_id": number
                  }
                  Insert: {
                    "business_id"?: string | null,"created_at"?: string,"error_message"?: string | null,"processed_at"?: string | null,"processing_status": string,"response_text"?: string | null,"telegram_user_id"?: number | null,"update_id": number
                  }
                  Update: {
                    "business_id"?: string | null,"created_at"?: string,"error_message"?: string | null,"processed_at"?: string | null,"processing_status"?: string,"response_text"?: string | null,"telegram_user_id"?: number | null,"update_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "processed_telegram_updates_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"processed_whatsapp_messages": {
                  Row: {
                    "business_id": string,"error_message": string | null,"message_id": string,"message_type": string,"payload_hash": string | null,"processed_at": string | null,"processing_status": string,"received_at": string,"response_text": string | null,"sender_phone": string
                  }
                  Insert: {
                    "business_id": string,"error_message"?: string | null,"message_id": string,"message_type"?: string,"payload_hash"?: string | null,"processed_at"?: string | null,"processing_status"?: string,"received_at"?: string,"response_text"?: string | null,"sender_phone": string
                  }
                  Update: {
                    "business_id"?: string,"error_message"?: string | null,"message_id"?: string,"message_type"?: string,"payload_hash"?: string | null,"processed_at"?: string | null,"processing_status"?: string,"received_at"?: string,"response_text"?: string | null,"sender_phone"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "processed_whatsapp_messages_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"products": {
                  Row: {
                    "active": boolean,"aliases": (string)[],"business_id": string,"created_at": string,"default_price": number,"id": string,"is_default": boolean,"name": string,"unit": string,"updated_at": string
                  }
                  Insert: {
                    "active"?: boolean,"aliases"?: (string)[],"business_id": string,"created_at"?: string,"default_price": number,"id"?: string,"is_default"?: boolean,"name": string,"unit"?: string,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"aliases"?: (string)[],"business_id"?: string,"created_at"?: string,"default_price"?: number,"id"?: string,"is_default"?: boolean,"name"?: string,"unit"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "products_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"telegram_authorized_users": {
                  Row: {
                    "active": boolean,"business_id": string,"created_at": string,"display_label": string | null,"id": string,"telegram_user_id": number,"updated_at": string
                  }
                  Insert: {
                    "active"?: boolean,"business_id": string,"created_at"?: string,"display_label"?: string | null,"id"?: string,"telegram_user_id": number,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"business_id"?: string,"created_at"?: string,"display_label"?: string | null,"id"?: string,"telegram_user_id"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "telegram_authorized_users_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"transaction_events": {
                  Row: {
                    "actor_user_id": string | null,"business_id": string,"created_at": string,"event_type": string,"id": string,"new_values": Json | null,"old_values": Json | null,"source": string,"transaction_id": string
                  }
                  Insert: {
                    "actor_user_id"?: string | null,"business_id": string,"created_at"?: string,"event_type": string,"id"?: string,"new_values"?: Json | null,"old_values"?: Json | null,"source"?: string,"transaction_id": string
                  }
                  Update: {
                    "actor_user_id"?: string | null,"business_id"?: string,"created_at"?: string,"event_type"?: string,"id"?: string,"new_values"?: Json | null,"old_values"?: Json | null,"source"?: string,"transaction_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "transaction_events_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "transaction_events_transaction_id_fkey"
      columns: ["transaction_id"]
isOneToOne: false
      referencedRelation: "transactions"
      referencedColumns: ["id"]
    }
                  ]
                },"transactions": {
                  Row: {
                    "business_id": string,"created_at": string,"created_by_user_id": string | null,"id": string,"product_id": string | null,"quantity": number,"raw_message": string | null,"sender_phone": string | null,"source": string,"status": string,"supersedes_transaction_id": string | null,"total_amount": number,"transaction_at": string,"transaction_type": string,"unit": string,"unit_price": number,"updated_at": string
                  }
                  Insert: {
                    "business_id": string,"created_at"?: string,"created_by_user_id"?: string | null,"id"?: string,"product_id"?: string | null,"quantity": number,"raw_message"?: string | null,"sender_phone"?: string | null,"source"?: string,"status"?: string,"supersedes_transaction_id"?: string | null,"total_amount": number,"transaction_at"?: string,"transaction_type"?: string,"unit": string,"unit_price": number,"updated_at"?: string
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"created_by_user_id"?: string | null,"id"?: string,"product_id"?: string | null,"quantity"?: number,"raw_message"?: string | null,"sender_phone"?: string | null,"source"?: string,"status"?: string,"supersedes_transaction_id"?: string | null,"total_amount"?: number,"transaction_at"?: string,"transaction_type"?: string,"unit"?: string,"unit_price"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "fk_transactions_product_tenant"
      columns: ["product_id","business_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id","business_id"]
    },{
      foreignKeyName: "transactions_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "transactions_supersedes_transaction_id_fkey"
      columns: ["supersedes_transaction_id"]
isOneToOne: false
      referencedRelation: "transactions"
      referencedColumns: ["id"]
    }
                  ]
                },"whatsapp_authorized_senders": {
                  Row: {
                    "active": boolean,"business_id": string,"created_at": string,"display_label": string | null,"id": string,"phone_number": string,"updated_at": string
                  }
                  Insert: {
                    "active"?: boolean,"business_id": string,"created_at"?: string,"display_label"?: string | null,"id"?: string,"phone_number": string,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"business_id"?: string,"created_at"?: string,"display_label"?: string | null,"id"?: string,"phone_number"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "whatsapp_authorized_senders_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"whatsapp_connections": {
                  Row: {
                    "business_id": string,"created_at": string,"id": string,"phone_number": string,"phone_number_id": string,"status": string,"updated_at": string,"waba_id": string | null
                  }
                  Insert: {
                    "business_id": string,"created_at"?: string,"id"?: string,"phone_number": string,"phone_number_id": string,"status"?: string,"updated_at"?: string,"waba_id"?: string | null
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"id"?: string,"phone_number"?: string,"phone_number_id"?: string,"status"?: string,"updated_at"?: string,"waba_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "whatsapp_connections_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "cancel_last_sale":
{ Args: { "p_actor_user_id"?: string,"p_business_id": string,"p_source"?: string }; Returns: Json
                           },
"claim_telegram_update":
{ Args: { "p_business_id"?: string,"p_telegram_user_id"?: number,"p_update_id": number }; Returns: Json
                           },
"claim_whatsapp_message":
{ Args: { "p_business_id": string,"p_message_id": string,"p_message_type"?: string,"p_payload_hash"?: string,"p_sender_phone": string }; Returns: Json
                           },
"complete_telegram_update":
{ Args: { "p_business_id"?: string,"p_error_message"?: string,"p_processing_status": string,"p_response_text"?: string,"p_update_id": number }; Returns: undefined
                           },
"complete_whatsapp_message":
{ Args: { "p_error_message"?: string,"p_message_id": string,"p_processing_status": string,"p_response_text"?: string }; Returns: undefined
                           },
"correct_last_sale":
{ Args: { "p_actor_user_id"?: string,"p_business_id": string,"p_corrected_quantity": number,"p_raw_message"?: string,"p_source"?: string }; Returns: Json
                           },
"get_business_sales_report":
{ Args: { "p_business_id": string,"p_end_at": string,"p_start_at": string }; Returns: Json
                           },
"record_sale":
{ Args: { "p_actor_user_id"?: string,"p_business_id": string,"p_quantity": number,"p_raw_message"?: string,"p_sender_phone"?: string,"p_source"?: string,"p_transaction_at"?: string,"p_unit"?: string }; Returns: Json
                           },
"set_business_daily_status":
{ Args: { "p_business_id": string,"p_local_date": string,"p_note"?: string,"p_source"?: string,"p_status": string }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const

