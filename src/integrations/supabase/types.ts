export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      caller_streams: {
        Row: {
          face_detected: boolean
          id: string
          is_streaming: boolean
          last_seen_at: string
          stream_started_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          face_detected?: boolean
          id?: string
          is_streaming?: boolean
          last_seen_at?: string
          stream_started_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          face_detected?: boolean
          id?: string
          is_streaming?: boolean
          last_seen_at?: string
          stream_started_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_data: {
        Row: {
          assigned_by: string | null
          assigned_to: string | null
          call_status: Database["public"]["Enums"]["call_status"]
          course: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          fee: number | null
          id: string
          last_called_at: string | null
          qualification: string | null
          remark: string | null
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_to?: string | null
          call_status?: Database["public"]["Enums"]["call_status"]
          course?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          fee?: number | null
          id?: string
          last_called_at?: string | null
          qualification?: string | null
          remark?: string | null
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string | null
          call_status?: Database["public"]["Enums"]["call_status"]
          course?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          fee?: number | null
          id?: string
          last_called_at?: string | null
          qualification?: string | null
          remark?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      face_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          is_active: boolean
          resolved_at: string | null
          started_at: string
          user_id: string
        }
        Insert: {
          alert_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          resolved_at?: string | null
          started_at?: string
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          resolved_at?: string | null
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          message: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          aadhaar_number: string | null
          address: string | null
          bank_account_number: string | null
          bank_name: string | null
          created_at: string
          email: string
          employee_id: string
          full_name: string
          id: string
          ifsc_code: string | null
          pan_number: string | null
          phone: string | null
          photo_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          aadhaar_number?: string | null
          address?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          email: string
          employee_id: string
          full_name: string
          id?: string
          ifsc_code?: string | null
          pan_number?: string | null
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          aadhaar_number?: string | null
          address?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          email?: string
          employee_id?: string
          full_name?: string
          id?: string
          ifsc_code?: string | null
          pan_number?: string | null
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      salary_records: {
        Row: {
          call_breakdown: Json
          created_at: string
          generated_at: string
          generated_by: string | null
          id: string
          period_end: string
          period_start: string
          period_type: string
          status: string
          total_amount: number
          total_calls: number
          user_id: string
        }
        Insert: {
          call_breakdown?: Json
          created_at?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          period_end: string
          period_start: string
          period_type: string
          status?: string
          total_amount?: number
          total_calls?: number
          user_id: string
        }
        Update: {
          call_breakdown?: Json
          created_at?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          period_end?: string
          period_start?: string
          period_type?: string
          status?: string
          total_amount?: number
          total_calls?: number
          user_id?: string
        }
        Relationships: []
      }
      salary_settings: {
        Row: {
          call_type: string
          created_at: string
          created_by: string | null
          id: string
          rate_per_call: number
          updated_at: string
          user_id: string
        }
        Insert: {
          call_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          rate_per_call?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          call_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          rate_per_call?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      session_logs: {
        Row: {
          duration_minutes: number | null
          id: string
          ip_address: string | null
          login_at: string
          logout_at: string | null
          user_id: string
        }
        Insert: {
          duration_minutes?: number | null
          id?: string
          ip_address?: string | null
          login_at?: string
          logout_at?: string | null
          user_id: string
        }
        Update: {
          duration_minutes?: number | null
          id?: string
          ip_address?: string | null
          login_at?: string
          logout_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_employee_id: {
        Args: { role_type: Database["public"]["Enums"]["app_role"] }
        Returns: string
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "co_admin" | "customer_caller"
      call_status:
        | "pending"
        | "call_not_received"
        | "call_disconnected"
        | "invalid_number"
        | "no_network"
        | "call_connected"
        | "interested"
        | "not_interested"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "co_admin", "customer_caller"],
      call_status: [
        "pending",
        "call_not_received",
        "call_disconnected",
        "invalid_number",
        "no_network",
        "call_connected",
        "interested",
        "not_interested",
      ],
    },
  },
} as const
