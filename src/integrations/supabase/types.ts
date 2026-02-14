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
      analytics_sessions: {
        Row: {
          bounce_rate: number | null
          channel: string | null
          conversions_count: number
          country: string | null
          created_at: string
          device: string | null
          engagement_rate: number | null
          id: string
          landing_page: string | null
          medium: string | null
          owner_id: string
          project_id: string
          revenue: number | null
          session_date: string
          sessions_count: number
          source: string | null
          users_count: number
        }
        Insert: {
          bounce_rate?: number | null
          channel?: string | null
          conversions_count?: number
          country?: string | null
          created_at?: string
          device?: string | null
          engagement_rate?: number | null
          id?: string
          landing_page?: string | null
          medium?: string | null
          owner_id: string
          project_id: string
          revenue?: number | null
          session_date?: string
          sessions_count?: number
          source?: string | null
          users_count?: number
        }
        Update: {
          bounce_rate?: number | null
          channel?: string | null
          conversions_count?: number
          country?: string | null
          created_at?: string
          device?: string | null
          engagement_rate?: number | null
          id?: string
          landing_page?: string | null
          medium?: string | null
          owner_id?: string
          project_id?: string
          revenue?: number | null
          session_date?: string
          sessions_count?: number
          source?: string | null
          users_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "analytics_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          detail: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          detail?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          detail?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      billing_subscriptions: {
        Row: {
          created_at: string
          events_limit: number
          events_used: number
          expires_at: string | null
          id: string
          mrr: number
          plan: string
          projects_limit: number
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          events_limit?: number
          events_used?: number
          expires_at?: string | null
          id?: string
          mrr?: number
          plan?: string
          projects_limit?: number
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          events_limit?: number
          events_used?: number
          expires_at?: string | null
          id?: string
          mrr?: number
          plan?: string
          projects_limit?: number
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversions: {
        Row: {
          campaign: string | null
          converted_at: string
          created_at: string
          device: string | null
          event_type: string
          id: string
          lead_email: string | null
          lead_name: string | null
          lead_phone: string | null
          location: string | null
          medium: string | null
          owner_id: string
          page: string | null
          project_id: string
          source: string | null
          value: number | null
        }
        Insert: {
          campaign?: string | null
          converted_at?: string
          created_at?: string
          device?: string | null
          event_type?: string
          id?: string
          lead_email?: string | null
          lead_name?: string | null
          lead_phone?: string | null
          location?: string | null
          medium?: string | null
          owner_id: string
          page?: string | null
          project_id: string
          source?: string | null
          value?: number | null
        }
        Update: {
          campaign?: string | null
          converted_at?: string
          created_at?: string
          device?: string | null
          event_type?: string
          id?: string
          lead_email?: string | null
          lead_name?: string | null
          lead_phone?: string | null
          location?: string | null
          medium?: string | null
          owner_id?: string
          page?: string | null
          project_id?: string
          source?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conversions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ga4_connections: {
        Row: {
          client_email: string
          connection_name: string
          created_at: string
          id: string
          last_sync_at: string | null
          owner_id: string
          private_key: string
          project_id: string
          property_id: string | null
          property_name: string | null
          updated_at: string
        }
        Insert: {
          client_email: string
          connection_name: string
          created_at?: string
          id?: string
          last_sync_at?: string | null
          owner_id: string
          private_key: string
          project_id: string
          property_id?: string | null
          property_name?: string | null
          updated_at?: string
        }
        Update: {
          client_email?: string
          connection_name?: string
          created_at?: string
          id?: string
          last_sync_at?: string | null
          owner_id?: string
          private_key?: string
          project_id?: string
          property_id?: string | null
          property_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ga4_connections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      gsc_connections: {
        Row: {
          client_email: string
          connection_name: string
          created_at: string
          id: string
          last_sync_at: string | null
          owner_id: string
          private_key: string
          project_id: string
          site_url: string | null
          updated_at: string
        }
        Insert: {
          client_email: string
          connection_name: string
          created_at?: string
          id?: string
          last_sync_at?: string | null
          owner_id: string
          private_key: string
          project_id: string
          site_url?: string | null
          updated_at?: string
        }
        Update: {
          client_email?: string
          connection_name?: string
          created_at?: string
          id?: string
          last_sync_at?: string | null
          owner_id?: string
          private_key?: string
          project_id?: string
          site_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gsc_connections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      index_coverage: {
        Row: {
          coverage_state: string | null
          crawled_as: string | null
          created_at: string
          id: string
          indexing_state: string | null
          inspected_at: string
          last_crawl_time: string | null
          owner_id: string
          page_fetch_state: string | null
          project_id: string
          referring_urls: string[] | null
          robotstxt_state: string | null
          sitemap: string | null
          updated_at: string
          url: string
          verdict: string | null
        }
        Insert: {
          coverage_state?: string | null
          crawled_as?: string | null
          created_at?: string
          id?: string
          indexing_state?: string | null
          inspected_at?: string
          last_crawl_time?: string | null
          owner_id: string
          page_fetch_state?: string | null
          project_id: string
          referring_urls?: string[] | null
          robotstxt_state?: string | null
          sitemap?: string | null
          updated_at?: string
          url: string
          verdict?: string | null
        }
        Update: {
          coverage_state?: string | null
          crawled_as?: string | null
          created_at?: string
          id?: string
          indexing_state?: string | null
          inspected_at?: string
          last_crawl_time?: string | null
          owner_id?: string
          page_fetch_state?: string | null
          project_id?: string
          referring_urls?: string[] | null
          robotstxt_state?: string | null
          sitemap?: string | null
          updated_at?: string
          url?: string
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "index_coverage_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          domain: string
          id: string
          monetization_status: string
          name: string
          onboarding_completed: boolean
          onboarding_step: number
          owner_id: string
          site_type: string | null
          status: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          domain: string
          id?: string
          monetization_status?: string
          name: string
          onboarding_completed?: boolean
          onboarding_step?: number
          owner_id: string
          site_type?: string | null
          status?: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          domain?: string
          id?: string
          monetization_status?: string
          name?: string
          onboarding_completed?: boolean
          onboarding_step?: number
          owner_id?: string
          site_type?: string | null
          status?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rr_clients: {
        Row: {
          address: string | null
          billing_model: string
          company_name: string
          contact_name: string
          created_at: string
          email: string | null
          id: string
          niche: string | null
          notes: string | null
          owner_id: string
          phone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          billing_model?: string
          company_name: string
          contact_name: string
          created_at?: string
          email?: string | null
          id?: string
          niche?: string | null
          notes?: string | null
          owner_id: string
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          billing_model?: string
          company_name?: string
          contact_name?: string
          created_at?: string
          email?: string | null
          id?: string
          niche?: string | null
          notes?: string | null
          owner_id?: string
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      rr_contracts: {
        Row: {
          client_id: string | null
          contract_type: string
          created_at: string
          end_date: string | null
          id: string
          monthly_value: number
          next_billing: string | null
          notes: string | null
          owner_id: string
          project_id: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          contract_type?: string
          created_at?: string
          end_date?: string | null
          id?: string
          monthly_value?: number
          next_billing?: string | null
          notes?: string | null
          owner_id: string
          project_id: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          contract_type?: string
          created_at?: string
          end_date?: string | null
          id?: string
          monthly_value?: number
          next_billing?: string | null
          notes?: string | null
          owner_id?: string
          project_id?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rr_contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "rr_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rr_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      rr_invoices: {
        Row: {
          amount: number
          client_id: string | null
          contract_id: string
          created_at: string
          due_date: string
          id: string
          owner_id: string
          paid_date: string | null
          status: string
        }
        Insert: {
          amount?: number
          client_id?: string | null
          contract_id: string
          created_at?: string
          due_date: string
          id?: string
          owner_id: string
          paid_date?: string | null
          status?: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          contract_id?: string
          created_at?: string
          due_date?: string
          id?: string
          owner_id?: string
          paid_date?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rr_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "rr_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rr_invoices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "rr_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      rr_pages: {
        Row: {
          client_id: string | null
          contract_id: string | null
          conversions: number
          created_at: string
          id: string
          leads: number
          location: string | null
          monthly_value: number
          niche: string | null
          owner_id: string
          priority: string
          project_id: string
          roi_estimated: number | null
          status: string
          suggested_price: number | null
          traffic: number
          updated_at: string
          url: string
        }
        Insert: {
          client_id?: string | null
          contract_id?: string | null
          conversions?: number
          created_at?: string
          id?: string
          leads?: number
          location?: string | null
          monthly_value?: number
          niche?: string | null
          owner_id: string
          priority?: string
          project_id: string
          roi_estimated?: number | null
          status?: string
          suggested_price?: number | null
          traffic?: number
          updated_at?: string
          url: string
        }
        Update: {
          client_id?: string | null
          contract_id?: string | null
          conversions?: number
          created_at?: string
          id?: string
          leads?: number
          location?: string | null
          monthly_value?: number
          niche?: string | null
          owner_id?: string
          priority?: string
          project_id?: string
          roi_estimated?: number | null
          status?: string
          suggested_price?: number | null
          traffic?: number
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "rr_pages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "rr_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rr_pages_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "rr_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rr_pages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_metrics: {
        Row: {
          clicks: number
          country: string | null
          created_at: string
          ctr: number
          device: string | null
          dimension_type: string
          id: string
          impressions: number
          metric_date: string
          owner_id: string
          position: number
          project_id: string
          query: string | null
          url: string | null
        }
        Insert: {
          clicks?: number
          country?: string | null
          created_at?: string
          ctr?: number
          device?: string | null
          dimension_type?: string
          id?: string
          impressions?: number
          metric_date?: string
          owner_id: string
          position?: number
          project_id: string
          query?: string | null
          url?: string | null
        }
        Update: {
          clicks?: number
          country?: string | null
          created_at?: string
          ctr?: number
          device?: string | null
          dimension_type?: string
          id?: string
          impressions?: number
          metric_date?: string
          owner_id?: string
          position?: number
          project_id?: string
          query?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_metrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      site_urls: {
        Row: {
          created_at: string
          discovered_at: string
          id: string
          last_crawl: string | null
          meta_description: string | null
          meta_title: string | null
          owner_id: string
          priority: string
          project_id: string
          status: string
          tags: string[] | null
          updated_at: string
          url: string
          url_group: string | null
          url_type: string
        }
        Insert: {
          created_at?: string
          discovered_at?: string
          id?: string
          last_crawl?: string | null
          meta_description?: string | null
          meta_title?: string | null
          owner_id: string
          priority?: string
          project_id: string
          status?: string
          tags?: string[] | null
          updated_at?: string
          url: string
          url_group?: string | null
          url_type?: string
        }
        Update: {
          created_at?: string
          discovered_at?: string
          id?: string
          last_crawl?: string | null
          meta_description?: string | null
          meta_title?: string | null
          owner_id?: string
          priority?: string
          project_id?: string
          status?: string
          tags?: string[] | null
          updated_at?: string
          url?: string
          url_group?: string | null
          url_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_urls_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
      is_project_member: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "analyst" | "readonly"
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
      app_role: ["owner", "admin", "analyst", "readonly"],
    },
  },
} as const
