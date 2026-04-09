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
      app_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value?: number
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      cash_audit_log: {
        Row: {
          action: string
          cash_entry_id: string | null
          created_at: string
          details: Json
          id: string
          performed_by: string | null
        }
        Insert: {
          action: string
          cash_entry_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          performed_by?: string | null
        }
        Update: {
          action?: string
          cash_entry_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          performed_by?: string | null
        }
        Relationships: []
      }
      cash_entries: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          type: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          type: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          type?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          active: boolean
          address: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          phone: string
        }
        Insert: {
          active?: boolean
          address?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          phone?: string
        }
        Update: {
          active?: boolean
          address?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          phone?: string
        }
        Relationships: []
      }
      daily_closes: {
        Row: {
          balance: number
          closed_by: string | null
          created_at: string
          date: string
          id: string
          total_expense: number
          total_income: number
        }
        Insert: {
          balance?: number
          closed_by?: string | null
          created_at?: string
          date: string
          id?: string
          total_expense?: number
          total_income?: number
        }
        Update: {
          balance?: number
          closed_by?: string | null
          created_at?: string
          date?: string
          id?: string
          total_expense?: number
          total_income?: number
        }
        Relationships: []
      }
      delivery_people: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          id: string
          name: string
          phone: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          phone?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          phone?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      price_change_log: {
        Row: {
          change_type: string
          changed_by: string | null
          created_at: string
          id: string
          item_name: string
          new_value: number
          old_value: number
        }
        Insert: {
          change_type: string
          changed_by?: string | null
          created_at?: string
          id?: string
          item_name: string
          new_value?: number
          old_value?: number
        }
        Update: {
          change_type?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          item_name?: string
          new_value?: number
          old_value?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      rentals: {
        Row: {
          address: string
          client_name: string
          created_at: string
          created_by: string | null
          delivered_by: string | null
          entry_time: string | null
          exit_time: string | null
          extra_hours: number
          floor_number: string | null
          floor_surcharge: number
          id: string
          payment_cash_amount: number
          payment_method: string
          payment_pending: boolean
          payment_split: boolean
          payment_transfer_amount: number
          phone: string
          picked_up_by: string | null
          price: number
          service_type: string
          status: string
          total: number
          zone: string
        }
        Insert: {
          address: string
          client_name: string
          created_at?: string
          created_by?: string | null
          delivered_by?: string | null
          entry_time?: string | null
          exit_time?: string | null
          extra_hours?: number
          floor_number?: string | null
          floor_surcharge?: number
          id?: string
          payment_cash_amount?: number
          payment_method?: string
          payment_pending?: boolean
          payment_split?: boolean
          payment_transfer_amount?: number
          phone: string
          picked_up_by?: string | null
          price?: number
          service_type: string
          status?: string
          total?: number
          zone: string
        }
        Update: {
          address?: string
          client_name?: string
          created_at?: string
          created_by?: string | null
          delivered_by?: string | null
          entry_time?: string | null
          exit_time?: string | null
          extra_hours?: number
          floor_number?: string | null
          floor_surcharge?: number
          id?: string
          payment_cash_amount?: number
          payment_method?: string
          payment_pending?: boolean
          payment_split?: boolean
          payment_transfer_amount?: number
          phone?: string
          picked_up_by?: string | null
          price?: number
          service_type?: string
          status?: string
          total?: number
          zone?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      zone_prices: {
        Row: {
          active: boolean
          created_at: string
          id: string
          price: number
          service_name: string
          zone_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          price?: number
          service_name: string
          zone_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          price?: number
          service_name?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zone_prices_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      zones: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "entrega"
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
      app_role: ["admin", "entrega"],
    },
  },
} as const
