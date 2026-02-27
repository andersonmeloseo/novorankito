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
      academy_lessons: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_published: boolean
          module_id: string
          sort_order: number
          title: string
          updated_at: string
          video_type: string
          video_url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_published?: boolean
          module_id: string
          sort_order?: number
          title: string
          updated_at?: string
          video_type?: string
          video_url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_published?: boolean
          module_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          video_type?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "academy_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_modules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          sort_order: number
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          sort_order?: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          sort_order?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      academy_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "academy_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_action_history: {
        Row: {
          action_detail: string | null
          action_type: string
          agent_id: string
          created_at: string
          id: string
          project_id: string
          result: Json | null
        }
        Insert: {
          action_detail?: string | null
          action_type: string
          agent_id: string
          created_at?: string
          id?: string
          project_id: string
          result?: Json | null
        }
        Update: {
          action_detail?: string | null
          action_type?: string
          agent_id?: string
          created_at?: string
          id?: string
          project_id?: string
          result?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_action_history_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_action_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_workflows: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          is_preset: boolean
          name: string
          owner_id: string
          project_id: string
          steps: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          is_preset?: boolean
          name: string
          owner_id: string
          project_id: string
          steps?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          is_preset?: boolean
          name?: string
          owner_id?: string
          project_id?: string
          steps?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_workflows_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          avatar_url: string | null
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          instructions: string | null
          is_system: boolean
          name: string
          notification_destination: string | null
          notification_triggers: string[] | null
          owner_id: string
          project_id: string
          speciality: string
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          instructions?: string | null
          is_system?: boolean
          name: string
          notification_destination?: string | null
          notification_triggers?: string[] | null
          owner_id: string
          project_id: string
          speciality?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          instructions?: string | null
          is_system?: boolean
          name?: string
          notification_destination?: string | null
          notification_triggers?: string[] | null
          owner_id?: string
          project_id?: string
          speciality?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_messages: {
        Row: {
          agent_id: string | null
          content: string
          created_at: string
          id: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          content: string
          created_at?: string
          id?: string
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          content?: string
          created_at?: string
          id?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
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
      api_configurations: {
        Row: {
          base_url: string | null
          category: string
          configured_by: string | null
          created_at: string
          description: string | null
          docs_url: string | null
          id: string
          is_configured: boolean
          name: string
          secret_key_name: string
          secret_value: string | null
          service_name: string
          status: string
          updated_at: string
        }
        Insert: {
          base_url?: string | null
          category?: string
          configured_by?: string | null
          created_at?: string
          description?: string | null
          docs_url?: string | null
          id?: string
          is_configured?: boolean
          name: string
          secret_key_name: string
          secret_value?: string | null
          service_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          base_url?: string | null
          category?: string
          configured_by?: string | null
          created_at?: string
          description?: string | null
          docs_url?: string | null
          id?: string
          is_configured?: boolean
          name?: string
          secret_key_name?: string
          secret_value?: string | null
          service_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          owner_id: string
          project_id: string
          rate_limit_per_minute: number | null
          scopes: string[] | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name?: string
          owner_id: string
          project_id: string
          rate_limit_per_minute?: number | null
          scopes?: string[] | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          owner_id?: string
          project_id?: string
          rate_limit_per_minute?: number | null
          scopes?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      app_errors: {
        Row: {
          created_at: string | null
          error_message: string
          error_stack: string | null
          function_name: string | null
          id: string
          metadata: Json | null
          project_id: string | null
          request_id: string | null
          source: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message: string
          error_stack?: string | null
          function_name?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string | null
          request_id?: string | null
          source: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string
          error_stack?: string | null
          function_name?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string | null
          request_id?: string | null
          source?: string
          user_id?: string | null
        }
        Relationships: []
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
      billing_notifications: {
        Row: {
          channel: string
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          notification_type: string
          sent_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          notification_type: string
          sent_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          notification_type?: string
          sent_at?: string | null
          status?: string
          user_id?: string
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
      competitor_analyses: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          project_id: string
          results: Json
          schemas_count: number
          updated_at: string
          urls: string[]
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          owner_id: string
          project_id: string
          results?: Json
          schemas_count?: number
          updated_at?: string
          urls?: string[]
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          project_id?: string
          results?: Json
          schemas_count?: number
          updated_at?: string
          urls?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "competitor_analyses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      conversions: {
        Row: {
          campaign: string | null
          city: string | null
          conversion_action_name: string | null
          converted_at: string
          country_code: string | null
          created_at: string
          currency: string | null
          device: string | null
          event_type: string
          fbc: string | null
          fbclid: string | null
          fbp: string | null
          gbraid: string | null
          gclid: string | null
          goal_project_id: string | null
          id: string
          ip_address: string | null
          lead_email: string | null
          lead_name: string | null
          lead_phone: string | null
          lead_status: string | null
          location: string | null
          medium: string | null
          offline_campaign_id: string | null
          owner_id: string
          page: string | null
          project_id: string
          quality: string | null
          source: string | null
          state: string | null
          transaction_id: string | null
          user_agent: string | null
          value: number | null
          visitor_id: string | null
          wbraid: string | null
          zip_code: string | null
        }
        Insert: {
          campaign?: string | null
          city?: string | null
          conversion_action_name?: string | null
          converted_at?: string
          country_code?: string | null
          created_at?: string
          currency?: string | null
          device?: string | null
          event_type?: string
          fbc?: string | null
          fbclid?: string | null
          fbp?: string | null
          gbraid?: string | null
          gclid?: string | null
          goal_project_id?: string | null
          id?: string
          ip_address?: string | null
          lead_email?: string | null
          lead_name?: string | null
          lead_phone?: string | null
          lead_status?: string | null
          location?: string | null
          medium?: string | null
          offline_campaign_id?: string | null
          owner_id: string
          page?: string | null
          project_id: string
          quality?: string | null
          source?: string | null
          state?: string | null
          transaction_id?: string | null
          user_agent?: string | null
          value?: number | null
          visitor_id?: string | null
          wbraid?: string | null
          zip_code?: string | null
        }
        Update: {
          campaign?: string | null
          city?: string | null
          conversion_action_name?: string | null
          converted_at?: string
          country_code?: string | null
          created_at?: string
          currency?: string | null
          device?: string | null
          event_type?: string
          fbc?: string | null
          fbclid?: string | null
          fbp?: string | null
          gbraid?: string | null
          gclid?: string | null
          goal_project_id?: string | null
          id?: string
          ip_address?: string | null
          lead_email?: string | null
          lead_name?: string | null
          lead_phone?: string | null
          lead_status?: string | null
          location?: string | null
          medium?: string | null
          offline_campaign_id?: string | null
          owner_id?: string
          page?: string | null
          project_id?: string
          quality?: string | null
          source?: string | null
          state?: string | null
          transaction_id?: string | null
          user_agent?: string | null
          value?: number | null
          visitor_id?: string | null
          wbraid?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversions_goal_project_id_fkey"
            columns: ["goal_project_id"]
            isOneToOne: false
            referencedRelation: "goal_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversions_offline_campaign_id_fkey"
            columns: ["offline_campaign_id"]
            isOneToOne: false
            referencedRelation: "offline_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_amount: number | null
          discount_percent: number | null
          duration: string
          duration_in_months: number | null
          id: string
          is_active: boolean
          max_uses: number | null
          plan_slugs: string[]
          stripe_coupon_id: string | null
          updated_at: string
          uses_count: number
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          duration?: string
          duration_in_months?: number | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          plan_slugs?: string[]
          stripe_coupon_id?: string | null
          updated_at?: string
          uses_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          duration?: string
          duration_in_months?: number | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          plan_slugs?: string[]
          stripe_coupon_id?: string | null
          updated_at?: string
          uses_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      custom_event_configs: {
        Row: {
          conditions: Json
          created_at: string
          display_name: string
          enabled: boolean
          fires_count: number
          id: string
          metadata: Json
          name: string
          owner_id: string
          project_id: string
          selector: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          conditions?: Json
          created_at?: string
          display_name: string
          enabled?: boolean
          fires_count?: number
          id?: string
          metadata?: Json
          name: string
          owner_id: string
          project_id: string
          selector?: string
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          conditions?: Json
          created_at?: string
          display_name?: string
          enabled?: boolean
          fires_count?: number
          id?: string
          metadata?: Json
          name?: string
          owner_id?: string
          project_id?: string
          selector?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_event_configs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          allowed_plans: string[]
          allowed_user_ids: string[]
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          key: string
          name: string
          updated_at: string
        }
        Insert: {
          allowed_plans?: string[]
          allowed_user_ids?: string[]
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key: string
          name: string
          updated_at?: string
        }
        Update: {
          allowed_plans?: string[]
          allowed_user_ids?: string[]
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
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
      goal_projects: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          module: string
          name: string
          owner_id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          module?: string
          name: string
          owner_id: string
          project_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          module?: string
          name?: string
          owner_id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
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
      indexing_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          fail_reason: string | null
          id: string
          owner_id: string
          project_id: string
          request_type: string
          response_code: number | null
          response_message: string | null
          retries: number
          status: string
          submitted_at: string
          updated_at: string
          url: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          fail_reason?: string | null
          id?: string
          owner_id: string
          project_id: string
          request_type?: string
          response_code?: number | null
          response_message?: string | null
          retries?: number
          status?: string
          submitted_at?: string
          updated_at?: string
          url: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          fail_reason?: string | null
          id?: string
          owner_id?: string
          project_id?: string
          request_type?: string
          response_code?: number | null
          response_message?: string | null
          retries?: number
          status?: string
          submitted_at?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "indexing_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      indexing_schedules: {
        Row: {
          actions: string[]
          created_at: string
          cron_time: string | null
          enabled: boolean
          id: string
          last_run_at: string | null
          last_run_result: Json | null
          max_urls: number
          owner_id: string
          project_id: string
          schedule_type: string
          scheduled_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          actions?: string[]
          created_at?: string
          cron_time?: string | null
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          last_run_result?: Json | null
          max_urls?: number
          owner_id: string
          project_id: string
          schedule_type?: string
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          actions?: string[]
          created_at?: string
          cron_time?: string | null
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          last_run_result?: Json | null
          max_urls?: number
          owner_id?: string
          project_id?: string
          schedule_type?: string
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "indexing_schedules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_action_log: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          owner_id: string | null
          project_id: string | null
          result: Json | null
          source: string
          status: string
          tool_args: Json | null
          tool_name: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          owner_id?: string | null
          project_id?: string | null
          result?: Json | null
          source?: string
          status?: string
          tool_args?: Json | null
          tool_name: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          owner_id?: string | null
          project_id?: string | null
          result?: Json | null
          source?: string
          status?: string
          tool_args?: Json | null
          tool_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_action_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_anomalies: {
        Row: {
          actioned_at: string | null
          anomaly_type: string
          claude_response: string | null
          created_at: string
          description: string | null
          id: string
          metric_data: Json | null
          owner_id: string
          project_id: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          actioned_at?: string | null
          anomaly_type: string
          claude_response?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metric_data?: Json | null
          owner_id: string
          project_id?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          actioned_at?: string | null
          anomaly_type?: string
          claude_response?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metric_data?: Json | null
          owner_id?: string
          project_id?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_anomalies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_automation_rules: {
        Row: {
          action_config: Json
          action_type: string
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          last_run_at: string | null
          name: string
          owner_id: string
          project_id: string | null
          runs_count: number
          trigger_filter: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          action_config?: Json
          action_type?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          name: string
          owner_id: string
          project_id?: string | null
          runs_count?: number
          trigger_filter?: Json
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          action_config?: Json
          action_type?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          name?: string
          owner_id?: string
          project_id?: string | null
          runs_count?: number
          trigger_filter?: Json
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_automation_rules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_sync_snapshots: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          owner_id: string
          project_id: string
          sections_synced: string[]
          snapshot_data: Json
          status: string
          sync_duration_ms: number | null
          total_records: number
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          owner_id: string
          project_id: string
          sections_synced?: string[]
          snapshot_data?: Json
          status?: string
          sync_duration_ms?: number | null
          total_records?: number
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          owner_id?: string
          project_id?: string
          sections_synced?: string[]
          snapshot_data?: Json
          status?: string
          sync_duration_ms?: number | null
          total_records?: number
        }
        Relationships: [
          {
            foreignKeyName: "mcp_sync_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          project_id: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          project_id?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          project_id?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      offline_campaigns: {
        Row: {
          conversion_action_name: string | null
          created_at: string
          default_currency: string | null
          default_value: number | null
          description: string | null
          id: string
          name: string
          owner_id: string
          platform: string
          project_id: string
          status: string
          total_conversions: number | null
          total_value: number | null
          updated_at: string
        }
        Insert: {
          conversion_action_name?: string | null
          created_at?: string
          default_currency?: string | null
          default_value?: number | null
          description?: string | null
          id?: string
          name: string
          owner_id: string
          platform?: string
          project_id: string
          status?: string
          total_conversions?: number | null
          total_value?: number | null
          updated_at?: string
        }
        Update: {
          conversion_action_name?: string | null
          created_at?: string
          default_currency?: string | null
          default_value?: number | null
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          platform?: string
          project_id?: string
          status?: string
          total_conversions?: number | null
          total_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offline_campaigns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      onpage_audits: {
        Row: {
          completed_at: string | null
          crawl_progress: number
          created_at: string
          domain: string
          id: string
          owner_id: string
          pages_crawled: number
          pages_total: number
          project_id: string
          started_at: string
          status: string
          summary: Json | null
          task_id: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          crawl_progress?: number
          created_at?: string
          domain: string
          id?: string
          owner_id: string
          pages_crawled?: number
          pages_total?: number
          project_id: string
          started_at?: string
          status?: string
          summary?: Json | null
          task_id?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          crawl_progress?: number
          created_at?: string
          domain?: string
          id?: string
          owner_id?: string
          pages_crawled?: number
          pages_total?: number
          project_id?: string
          started_at?: string
          status?: string
          summary?: Json | null
          task_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onpage_audits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      onpage_pages: {
        Row: {
          audit_id: string
          checks: Json | null
          created_at: string
          external_links_count: number | null
          h1: string | null
          id: string
          images_count: number | null
          images_without_alt: number | null
          internal_links_count: number | null
          load_time: number | null
          meta_description: string | null
          meta_title: string | null
          owner_id: string
          page_score: number | null
          project_id: string
          size: number | null
          status_code: number | null
          url: string
        }
        Insert: {
          audit_id: string
          checks?: Json | null
          created_at?: string
          external_links_count?: number | null
          h1?: string | null
          id?: string
          images_count?: number | null
          images_without_alt?: number | null
          internal_links_count?: number | null
          load_time?: number | null
          meta_description?: string | null
          meta_title?: string | null
          owner_id: string
          page_score?: number | null
          project_id: string
          size?: number | null
          status_code?: number | null
          url: string
        }
        Update: {
          audit_id?: string
          checks?: Json | null
          created_at?: string
          external_links_count?: number | null
          h1?: string | null
          id?: string
          images_count?: number | null
          images_without_alt?: number | null
          internal_links_count?: number | null
          load_time?: number | null
          meta_description?: string | null
          meta_title?: string | null
          owner_id?: string
          page_score?: number | null
          project_id?: string
          size?: number | null
          status_code?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "onpage_pages_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "onpage_audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onpage_pages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      orchestrator_deployments: {
        Row: {
          created_at: string
          delivery_channels: Json
          delivery_config: Json
          hierarchy: Json
          id: string
          last_run_at: string | null
          name: string
          next_run_at: string | null
          owner_id: string
          project_id: string
          roles: Json
          run_count: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_channels?: Json
          delivery_config?: Json
          hierarchy?: Json
          id?: string
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          owner_id: string
          project_id: string
          roles?: Json
          run_count?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_channels?: Json
          delivery_config?: Json
          hierarchy?: Json
          id?: string
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          owner_id?: string
          project_id?: string
          roles?: Json
          run_count?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orchestrator_deployments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      orchestrator_runs: {
        Row: {
          agent_results: Json
          completed_at: string | null
          created_at: string
          delivery_status: Json
          deployment_id: string
          id: string
          owner_id: string
          project_id: string
          started_at: string
          status: string
          summary: string | null
        }
        Insert: {
          agent_results?: Json
          completed_at?: string | null
          created_at?: string
          delivery_status?: Json
          deployment_id: string
          id?: string
          owner_id: string
          project_id: string
          started_at?: string
          status?: string
          summary?: string | null
        }
        Update: {
          agent_results?: Json
          completed_at?: string | null
          created_at?: string
          delivery_status?: Json
          deployment_id?: string
          id?: string
          owner_id?: string
          project_id?: string
          started_at?: string
          status?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orchestrator_runs_deployment_id_fkey"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "orchestrator_deployments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orchestrator_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      orchestrator_tasks: {
        Row: {
          assigned_role: string | null
          assigned_role_emoji: string | null
          assigned_to_human: string | null
          category: string
          completed_at: string | null
          context_url: string | null
          created_at: string
          deployment_id: string | null
          description: string | null
          due_date: string | null
          estimated_impact: string | null
          id: string
          metadata: Json | null
          owner_id: string
          priority: string
          project_id: string | null
          run_id: string | null
          status: string
          success_metric: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_role?: string | null
          assigned_role_emoji?: string | null
          assigned_to_human?: string | null
          category?: string
          completed_at?: string | null
          context_url?: string | null
          created_at?: string
          deployment_id?: string | null
          description?: string | null
          due_date?: string | null
          estimated_impact?: string | null
          id?: string
          metadata?: Json | null
          owner_id: string
          priority?: string
          project_id?: string | null
          run_id?: string | null
          status?: string
          success_metric?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_role?: string | null
          assigned_role_emoji?: string | null
          assigned_to_human?: string | null
          category?: string
          completed_at?: string | null
          context_url?: string | null
          created_at?: string
          deployment_id?: string | null
          description?: string | null
          due_date?: string | null
          estimated_impact?: string | null
          id?: string
          metadata?: Json | null
          owner_id?: string
          priority?: string
          project_id?: string | null
          run_id?: string | null
          status?: string
          success_metric?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orchestrator_tasks_deployment_id_fkey"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "orchestrator_deployments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orchestrator_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orchestrator_tasks_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "orchestrator_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_features: {
        Row: {
          created_at: string
          enabled: boolean
          feature_key: string
          feature_name: string
          id: string
          plan_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature_key: string
          feature_name: string
          id?: string
          plan_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature_key?: string
          feature_name?: string
          id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_usage: {
        Row: {
          ai_requests_used: number
          created_at: string
          events_used: number
          id: string
          period: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_requests_used?: number
          created_at?: string
          events_used?: number
          id?: string
          period: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_requests_used?: number
          created_at?: string
          events_used?: number
          id?: string
          period?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          advanced_analytics_enabled: boolean
          ai_requests_limit: number
          annual_price: number | null
          api_access_enabled: boolean
          billing_interval: string
          created_at: string
          currency: string
          description: string | null
          events_limit: number
          ga4_enabled: boolean
          gsc_accounts_per_project: number
          id: string
          indexing_daily_limit: number
          is_active: boolean
          is_default: boolean
          members_limit: number
          name: string
          orchestrator_executions_limit: number
          payment_methods: string[] | null
          pixel_tracking_enabled: boolean
          price: number
          projects_limit: number
          promo_ends_at: string | null
          promo_price: number | null
          rank_rent_enabled: boolean
          slug: string
          sort_order: number
          stripe_annual_checkout_url: string | null
          stripe_annual_price_id: string | null
          stripe_checkout_url: string | null
          stripe_price_id: string | null
          trial_days: number
          updated_at: string
          webhooks_enabled: boolean
          whatsapp_reports_enabled: boolean
          white_label_enabled: boolean
        }
        Insert: {
          advanced_analytics_enabled?: boolean
          ai_requests_limit?: number
          annual_price?: number | null
          api_access_enabled?: boolean
          billing_interval?: string
          created_at?: string
          currency?: string
          description?: string | null
          events_limit?: number
          ga4_enabled?: boolean
          gsc_accounts_per_project?: number
          id?: string
          indexing_daily_limit?: number
          is_active?: boolean
          is_default?: boolean
          members_limit?: number
          name: string
          orchestrator_executions_limit?: number
          payment_methods?: string[] | null
          pixel_tracking_enabled?: boolean
          price?: number
          projects_limit?: number
          promo_ends_at?: string | null
          promo_price?: number | null
          rank_rent_enabled?: boolean
          slug: string
          sort_order?: number
          stripe_annual_checkout_url?: string | null
          stripe_annual_price_id?: string | null
          stripe_checkout_url?: string | null
          stripe_price_id?: string | null
          trial_days?: number
          updated_at?: string
          webhooks_enabled?: boolean
          whatsapp_reports_enabled?: boolean
          white_label_enabled?: boolean
        }
        Update: {
          advanced_analytics_enabled?: boolean
          ai_requests_limit?: number
          annual_price?: number | null
          api_access_enabled?: boolean
          billing_interval?: string
          created_at?: string
          currency?: string
          description?: string | null
          events_limit?: number
          ga4_enabled?: boolean
          gsc_accounts_per_project?: number
          id?: string
          indexing_daily_limit?: number
          is_active?: boolean
          is_default?: boolean
          members_limit?: number
          name?: string
          orchestrator_executions_limit?: number
          payment_methods?: string[] | null
          pixel_tracking_enabled?: boolean
          price?: number
          projects_limit?: number
          promo_ends_at?: string | null
          promo_price?: number | null
          rank_rent_enabled?: boolean
          slug?: string
          sort_order?: number
          stripe_annual_checkout_url?: string | null
          stripe_annual_price_id?: string | null
          stripe_checkout_url?: string | null
          stripe_price_id?: string | null
          trial_days?: number
          updated_at?: string
          webhooks_enabled?: boolean
          whatsapp_reports_enabled?: boolean
          white_label_enabled?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
          whatsapp_phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
          whatsapp_phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          whatsapp_phone?: string | null
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
      rate_limits: {
        Row: {
          count: number | null
          key: string
          window_start: string
        }
        Insert: {
          count?: number | null
          key: string
          window_start: string
        }
        Update: {
          count?: number | null
          key?: string
          window_start?: string
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
      semantic_entities: {
        Row: {
          created_at: string
          description: string | null
          entity_type: string
          goal_project_id: string | null
          id: string
          metadata: Json | null
          name: string
          owner_id: string
          position_x: number | null
          position_y: number | null
          project_id: string
          schema_properties: Json | null
          schema_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          entity_type?: string
          goal_project_id?: string | null
          id?: string
          metadata?: Json | null
          name: string
          owner_id: string
          position_x?: number | null
          position_y?: number | null
          project_id: string
          schema_properties?: Json | null
          schema_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          entity_type?: string
          goal_project_id?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          owner_id?: string
          position_x?: number | null
          position_y?: number | null
          project_id?: string
          schema_properties?: Json | null
          schema_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "semantic_entities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      semantic_goals: {
        Row: {
          created_at: string
          description: string | null
          goal_project_id: string
          goal_type: string
          id: string
          name: string
          owner_id: string
          project_id: string
          status: string
          steps: Json
          template_key: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          goal_project_id: string
          goal_type?: string
          id?: string
          name: string
          owner_id: string
          project_id: string
          status?: string
          steps?: Json
          template_key?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          goal_project_id?: string
          goal_type?: string
          id?: string
          name?: string
          owner_id?: string
          project_id?: string
          status?: string
          steps?: Json
          template_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "semantic_goals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      semantic_implementation_plans: {
        Row: {
          created_at: string
          goal_project_id: string
          id: string
          owner_id: string
          plan: Json
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          goal_project_id: string
          id?: string
          owner_id: string
          plan?: Json
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          goal_project_id?: string
          id?: string
          owner_id?: string
          plan?: Json
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "semantic_implementation_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      semantic_relations: {
        Row: {
          confidence: number | null
          created_at: string
          goal_project_id: string | null
          id: string
          metadata: Json | null
          object_id: string
          owner_id: string
          predicate: string
          project_id: string
          subject_id: string
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          goal_project_id?: string | null
          id?: string
          metadata?: Json | null
          object_id: string
          owner_id: string
          predicate: string
          project_id: string
          subject_id: string
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          goal_project_id?: string | null
          id?: string
          metadata?: Json | null
          object_id?: string
          owner_id?: string
          predicate?: string
          project_id?: string
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "semantic_relations_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "semantic_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "semantic_relations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "semantic_relations_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "semantic_entities"
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
      session_recordings: {
        Row: {
          browser: string | null
          created_at: string
          device: string | null
          duration_ms: number | null
          events_count: number | null
          id: string
          os: string | null
          page_url: string | null
          project_id: string
          recording_data: Json
          screen_height: number | null
          screen_width: number | null
          session_id: string
          updated_at: string
          visitor_id: string | null
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device?: string | null
          duration_ms?: number | null
          events_count?: number | null
          id?: string
          os?: string | null
          page_url?: string | null
          project_id: string
          recording_data?: Json
          screen_height?: number | null
          screen_width?: number | null
          session_id: string
          updated_at?: string
          visitor_id?: string | null
        }
        Update: {
          browser?: string | null
          created_at?: string
          device?: string | null
          duration_ms?: number | null
          events_count?: number | null
          id?: string
          os?: string | null
          page_url?: string | null
          project_id?: string
          recording_data?: Json
          screen_height?: number | null
          screen_width?: number | null
          session_id?: string
          updated_at?: string
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_recordings_project_id_fkey"
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
      stripe_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string | null
          description: string | null
          error_message: string | null
          hosted_invoice_url: string | null
          id: string
          invoice_pdf: string | null
          paid: boolean
          period_end: string | null
          period_start: string | null
          plan_name: string | null
          status: string
          stripe_created_at: string
          stripe_customer_id: string | null
          stripe_invoice_id: string
          stripe_subscription_id: string | null
          synced_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          description?: string | null
          error_message?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf?: string | null
          paid?: boolean
          period_end?: string | null
          period_start?: string | null
          plan_name?: string | null
          status?: string
          stripe_created_at?: string
          stripe_customer_id?: string | null
          stripe_invoice_id: string
          stripe_subscription_id?: string | null
          synced_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          description?: string | null
          error_message?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf?: string | null
          paid?: boolean
          period_end?: string | null
          period_start?: string | null
          plan_name?: string | null
          status?: string
          stripe_created_at?: string
          stripe_customer_id?: string | null
          stripe_invoice_id?: string
          stripe_subscription_id?: string | null
          synced_at?: string
        }
        Relationships: []
      }
      sync_jobs: {
        Row: {
          attempts: number | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          job_type: string
          locked_at: string | null
          max_attempts: number | null
          owner_id: string
          payload: Json | null
          project_id: string
          result: Json | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_type: string
          locked_at?: string | null
          max_attempts?: number | null
          owner_id: string
          payload?: Json | null
          project_id: string
          result?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_type?: string
          locked_at?: string | null
          max_attempts?: number | null
          owner_id?: string
          payload?: Json | null
          project_id?: string
          result?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      system_announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string
          ends_at: string | null
          id: string
          is_active: boolean
          starts_at: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          starts_at?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          starts_at?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_hub_entries: {
        Row: {
          content: string | null
          created_at: string
          deployment_id: string
          id: string
          notify_whatsapp: boolean
          owner_id: string
          project_id: string | null
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          deployment_id: string
          id?: string
          notify_whatsapp?: boolean
          owner_id: string
          project_id?: string | null
          status?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          deployment_id?: string
          id?: string
          notify_whatsapp?: boolean
          owner_id?: string
          project_id?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_hub_entries_deployment_id_fkey"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "orchestrator_deployments"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_events: {
        Row: {
          browser: string | null
          cart_value: number | null
          city: string | null
          country: string | null
          created_at: string
          cta_selector: string | null
          cta_text: string | null
          device: string | null
          event_type: string
          fbclid: string | null
          form_id: string | null
          gclid: string | null
          id: string
          ip_address: string | null
          language: string | null
          metadata: Json | null
          os: string | null
          page_title: string | null
          page_url: string | null
          platform: string | null
          product_id: string | null
          product_name: string | null
          product_price: number | null
          project_id: string
          referrer: string | null
          screen_height: number | null
          screen_width: number | null
          scroll_depth: number | null
          session_id: string | null
          state: string | null
          time_on_page: number | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          visitor_id: string | null
        }
        Insert: {
          browser?: string | null
          cart_value?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          cta_selector?: string | null
          cta_text?: string | null
          device?: string | null
          event_type?: string
          fbclid?: string | null
          form_id?: string | null
          gclid?: string | null
          id?: string
          ip_address?: string | null
          language?: string | null
          metadata?: Json | null
          os?: string | null
          page_title?: string | null
          page_url?: string | null
          platform?: string | null
          product_id?: string | null
          product_name?: string | null
          product_price?: number | null
          project_id: string
          referrer?: string | null
          screen_height?: number | null
          screen_width?: number | null
          scroll_depth?: number | null
          session_id?: string | null
          state?: string | null
          time_on_page?: number | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string | null
        }
        Update: {
          browser?: string | null
          cart_value?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          cta_selector?: string | null
          cta_text?: string | null
          device?: string | null
          event_type?: string
          fbclid?: string | null
          form_id?: string | null
          gclid?: string | null
          id?: string
          ip_address?: string | null
          language?: string | null
          metadata?: Json | null
          os?: string | null
          page_title?: string | null
          page_url?: string | null
          platform?: string | null
          product_id?: string | null
          product_name?: string | null
          product_price?: number | null
          project_id?: string
          referrer?: string | null
          screen_height?: number | null
          screen_width?: number | null
          scroll_depth?: number | null
          session_id?: string | null
          state?: string | null
          time_on_page?: number | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracking_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_goals: {
        Row: {
          config: Json | null
          created_at: string
          currency_value: number | null
          description: string | null
          enabled: boolean
          goal_project_id: string | null
          goal_type: string
          id: string
          name: string
          owner_id: string
          project_id: string
          target_events: string[] | null
          target_urls: string[] | null
          target_value: number
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          currency_value?: number | null
          description?: string | null
          enabled?: boolean
          goal_project_id?: string | null
          goal_type?: string
          id?: string
          name: string
          owner_id: string
          project_id: string
          target_events?: string[] | null
          target_urls?: string[] | null
          target_value?: number
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          currency_value?: number | null
          description?: string | null
          enabled?: boolean
          goal_project_id?: string | null
          goal_type?: string
          id?: string
          name?: string
          owner_id?: string
          project_id?: string
          target_events?: string[] | null
          target_urls?: string[] | null
          target_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_goals_goal_project_id_fkey"
            columns: ["goal_project_id"]
            isOneToOne: false
            referencedRelation: "goal_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_goals_project_id_fkey"
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
      webhook_deliveries: {
        Row: {
          created_at: string
          delivered_at: string | null
          event_type: string
          id: string
          payload: Json
          project_id: string
          response_body: string | null
          response_status: number | null
          webhook_id: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          event_type: string
          id?: string
          payload?: Json
          project_id: string
          response_body?: string | null
          response_status?: number | null
          webhook_id: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          event_type?: string
          id?: string
          payload?: Json
          project_id?: string
          response_body?: string | null
          response_status?: number | null
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string
          events: string[] | null
          failure_count: number | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          owner_id: string
          project_id: string
          secret: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          events?: string[] | null
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          owner_id: string
          project_id: string
          secret: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          events?: string[] | null
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          owner_id?: string
          project_id?: string
          secret?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      whitelabel_settings: {
        Row: {
          accent_color: string | null
          brand_name: string | null
          created_at: string
          custom_domain: string | null
          favicon_url: string | null
          footer_text: string | null
          gradient_end_color: string | null
          hide_powered_by: boolean | null
          id: string
          login_subtitle: string | null
          login_title: string | null
          logo_url: string | null
          owner_id: string
          primary_color: string | null
          project_id: string
          sidebar_bg_color: string | null
          subtitle: string | null
          support_email: string | null
          support_url: string | null
          text_color: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          brand_name?: string | null
          created_at?: string
          custom_domain?: string | null
          favicon_url?: string | null
          footer_text?: string | null
          gradient_end_color?: string | null
          hide_powered_by?: boolean | null
          id?: string
          login_subtitle?: string | null
          login_title?: string | null
          logo_url?: string | null
          owner_id: string
          primary_color?: string | null
          project_id: string
          sidebar_bg_color?: string | null
          subtitle?: string | null
          support_email?: string | null
          support_url?: string | null
          text_color?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          brand_name?: string | null
          created_at?: string
          custom_domain?: string | null
          favicon_url?: string | null
          footer_text?: string | null
          gradient_end_color?: string | null
          hide_powered_by?: boolean | null
          id?: string
          login_subtitle?: string | null
          login_title?: string | null
          logo_url?: string | null
          owner_id?: string
          primary_color?: string | null
          project_id?: string
          sidebar_bg_color?: string | null
          subtitle?: string | null
          support_email?: string | null
          support_url?: string | null
          text_color?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whitelabel_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_deliveries: {
        Row: {
          channel: string
          created_at: string
          delivered_at: string | null
          error_message: string | null
          full_report: string | null
          id: string
          pdf_url: string | null
          project_id: string
          recipient: string
          report_summary: string | null
          schedule_id: string
          status: string
          workflow_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          full_report?: string | null
          id?: string
          pdf_url?: string | null
          project_id: string
          recipient: string
          report_summary?: string | null
          schedule_id: string
          status?: string
          workflow_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          full_report?: string | null
          id?: string
          pdf_url?: string | null
          project_id?: string
          recipient?: string
          report_summary?: string | null
          schedule_id?: string
          status?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_deliveries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_deliveries_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "workflow_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_schedules: {
        Row: {
          created_at: string
          email_recipients: string[]
          enabled: boolean
          id: string
          last_run_at: string | null
          last_run_status: string | null
          next_run_at: string | null
          notify_email: boolean
          notify_whatsapp: boolean
          owner_id: string
          project_id: string
          recipient_name: string | null
          schedule_days: number[]
          schedule_time: string
          send_pdf: boolean
          send_summary: boolean
          timezone: string
          updated_at: string
          whatsapp_recipients: string[]
          workflow_id: string
        }
        Insert: {
          created_at?: string
          email_recipients?: string[]
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          last_run_status?: string | null
          next_run_at?: string | null
          notify_email?: boolean
          notify_whatsapp?: boolean
          owner_id: string
          project_id: string
          recipient_name?: string | null
          schedule_days?: number[]
          schedule_time?: string
          send_pdf?: boolean
          send_summary?: boolean
          timezone?: string
          updated_at?: string
          whatsapp_recipients?: string[]
          workflow_id: string
        }
        Update: {
          created_at?: string
          email_recipients?: string[]
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          last_run_status?: string | null
          next_run_at?: string | null
          notify_email?: boolean
          notify_whatsapp?: boolean
          owner_id?: string
          project_id?: string
          recipient_name?: string | null
          schedule_days?: number[]
          schedule_time?: string
          send_pdf?: boolean
          send_summary?: boolean
          timezone?: string
          updated_at?: string
          whatsapp_recipients?: string[]
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_schedules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      api_configurations_decrypted: {
        Row: {
          base_url: string | null
          category: string | null
          configured_by: string | null
          created_at: string | null
          description: string | null
          docs_url: string | null
          id: string | null
          is_configured: boolean | null
          name: string | null
          secret_key_name: string | null
          secret_value: string | null
          service_name: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          base_url?: string | null
          category?: string | null
          configured_by?: string | null
          created_at?: string | null
          description?: string | null
          docs_url?: string | null
          id?: string | null
          is_configured?: boolean | null
          name?: string | null
          secret_key_name?: string | null
          secret_value?: never
          service_name?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          base_url?: string | null
          category?: string | null
          configured_by?: string | null
          created_at?: string | null
          description?: string | null
          docs_url?: string | null
          id?: string | null
          is_configured?: boolean | null
          name?: string | null
          secret_key_name?: string | null
          secret_value?: never
          service_name?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ga4_connections_decrypted: {
        Row: {
          client_email: string | null
          connection_name: string | null
          created_at: string | null
          id: string | null
          last_sync_at: string | null
          owner_id: string | null
          private_key: string | null
          project_id: string | null
          property_id: string | null
          property_name: string | null
          updated_at: string | null
        }
        Insert: {
          client_email?: string | null
          connection_name?: string | null
          created_at?: string | null
          id?: string | null
          last_sync_at?: string | null
          owner_id?: string | null
          private_key?: never
          project_id?: string | null
          property_id?: string | null
          property_name?: string | null
          updated_at?: string | null
        }
        Update: {
          client_email?: string | null
          connection_name?: string | null
          created_at?: string | null
          id?: string | null
          last_sync_at?: string | null
          owner_id?: string | null
          private_key?: never
          project_id?: string | null
          property_id?: string | null
          property_name?: string | null
          updated_at?: string | null
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
      gsc_connections_decrypted: {
        Row: {
          client_email: string | null
          connection_name: string | null
          created_at: string | null
          id: string | null
          last_sync_at: string | null
          owner_id: string | null
          private_key: string | null
          project_id: string | null
          site_url: string | null
          updated_at: string | null
        }
        Insert: {
          client_email?: string | null
          connection_name?: string | null
          created_at?: string | null
          id?: string | null
          last_sync_at?: string | null
          owner_id?: string | null
          private_key?: never
          project_id?: string | null
          site_url?: string | null
          updated_at?: string | null
        }
        Update: {
          client_email?: string | null
          connection_name?: string | null
          created_at?: string | null
          id?: string | null
          last_sync_at?: string | null
          owner_id?: string | null
          private_key?: never
          project_id?: string | null
          site_url?: string | null
          updated_at?: string | null
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
    }
    Functions: {
      check_plan_limit: {
        Args: { _limit_type: string; _user_id: string }
        Returns: Json
      }
      check_rate_limit: {
        Args: {
          p_key: string
          p_max_requests: number
          p_window_seconds: number
        }
        Returns: boolean
      }
      decrypt_sensitive: { Args: { encrypted_text: string }; Returns: string }
      encrypt_sensitive: { Args: { plain_text: string }; Returns: string }
      get_project_overview: { Args: { p_project_id: string }; Returns: Json }
      get_project_overview_v2: { Args: { p_project_id: string }; Returns: Json }
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
      plan_has_feature: {
        Args: { _feature_key: string; _user_id: string }
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
