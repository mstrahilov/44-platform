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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      achievement_events: {
        Row: {
          achievement_id: string | null
          created_at: string
          event_type: string
          id: string
          item_id: string | null
          metadata: Json
          user_id: string
        }
        Insert: {
          achievement_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          item_id?: string | null
          metadata?: Json
          user_id: string
        }
        Update: {
          achievement_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          item_id?: string | null
          metadata?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievement_events_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "item_achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievement_events_product_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      achievement_playback_signals: {
        Row: {
          id: string
          item_id: string
          metadata: Json
          occurred_at: string
          session_id: string
          signal_type: string
          track_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          item_id: string
          metadata?: Json
          occurred_at?: string
          session_id: string
          signal_type: string
          track_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          item_id?: string
          metadata?: Json
          occurred_at?: string
          session_id?: string
          signal_type?: string
          track_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievement_playback_signals_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievement_playback_signals_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      achievement_progress: {
        Row: {
          id: string
          item_id: string
          metadata: Json
          metric: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          id?: string
          item_id: string
          metadata?: Json
          metric: string
          updated_at?: string
          user_id: string
          value?: number
        }
        Update: {
          id?: string
          item_id?: string
          metadata?: Json
          metric?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "achievement_progress_product_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievement_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      achievement_templates: {
        Row: {
          code: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          is_secret: boolean
          points: number
          sort_order: number
          supported_experiences: string[]
          title: string
          trigger_config: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_secret?: boolean
          points?: number
          sort_order?: number
          supported_experiences?: string[]
          title: string
          trigger_config?: Json
          trigger_type: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_secret?: boolean
          points?: number
          sort_order?: number
          supported_experiences?: string[]
          title?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_item_lifecycle_events: {
        Row: {
          action: string
          changed_by: string
          created_at: string
          id: string
          item_id: string
          new_status: string
          previous_status: string
          reason: string
        }
        Insert: {
          action: string
          changed_by: string
          created_at?: string
          id?: string
          item_id: string
          new_status: string
          previous_status: string
          reason: string
        }
        Update: {
          action?: string
          changed_by?: string
          created_at?: string
          id?: string
          item_id?: string
          new_status?: string
          previous_status?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_item_lifecycle_events_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_item_lifecycle_events_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_offer_lifecycle_events: {
        Row: {
          action: string
          changed_by: string
          created_at: string
          id: string
          item_id: string
          new_status: string
          offer_id: string
          previous_status: string
          reason: string
        }
        Insert: {
          action: string
          changed_by: string
          created_at?: string
          id?: string
          item_id: string
          new_status: string
          offer_id: string
          previous_status: string
          reason: string
        }
        Update: {
          action?: string
          changed_by?: string
          created_at?: string
          id?: string
          item_id?: string
          new_status?: string
          offer_id?: string
          previous_status?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_offer_lifecycle_events_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_offer_lifecycle_events_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_offer_lifecycle_events_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "catalog_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_profile_role_events: {
        Row: {
          changed_by: string
          created_at: string
          id: string
          new_role: string
          previous_role: string
          profile_id: string
          reason: string
        }
        Insert: {
          changed_by: string
          created_at?: string
          id?: string
          new_role: string
          previous_role: string
          profile_id: string
          reason: string
        }
        Update: {
          changed_by?: string
          created_at?: string
          id?: string
          new_role?: string
          previous_role?: string
          profile_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_profile_role_events_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_profile_role_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      beat_attribute_assignments: {
        Row: {
          created_at: string
          item_id: string
          term_id: string
        }
        Insert: {
          created_at?: string
          item_id: string
          term_id: string
        }
        Update: {
          created_at?: string
          item_id?: string
          term_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beat_attribute_assignments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "beat_details"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "beat_attribute_assignments_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "beat_attribute_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      beat_attribute_terms: {
        Row: {
          attribute_kind: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          attribute_kind: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          attribute_kind?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      beat_collaborator_splits: {
        Row: {
          acceptance_status: string
          accepted_at: string | null
          created_at: string
          item_id: string
          profile_id: string
          publishing_share_bps: number
          revenue_share_bps: number
          updated_at: string
        }
        Insert: {
          acceptance_status?: string
          accepted_at?: string | null
          created_at?: string
          item_id: string
          profile_id: string
          publishing_share_bps: number
          revenue_share_bps: number
          updated_at?: string
        }
        Update: {
          acceptance_status?: string
          accepted_at?: string | null
          created_at?: string
          item_id?: string
          profile_id?: string
          publishing_share_bps?: number
          revenue_share_bps?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beat_collaborator_splits_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "beat_details"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "beat_collaborator_splits_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      beat_details: {
        Row: {
          bpm: number
          created_at: string
          item_id: string
          key_mode: string | null
          key_not_applicable: boolean
          key_root: string | null
          preview_track_id: string
          sale_status: string
          sample_disclosure: string | null
          sample_status: string
          sold_at: string | null
          time_signature: string
          updated_at: string
        }
        Insert: {
          bpm: number
          created_at?: string
          item_id: string
          key_mode?: string | null
          key_not_applicable?: boolean
          key_root?: string | null
          preview_track_id: string
          sale_status?: string
          sample_disclosure?: string | null
          sample_status?: string
          sold_at?: string | null
          time_signature?: string
          updated_at?: string
        }
        Update: {
          bpm?: number
          created_at?: string
          item_id?: string
          key_mode?: string | null
          key_not_applicable?: boolean
          key_root?: string | null
          preview_track_id?: string
          sale_status?: string
          sample_disclosure?: string | null
          sample_status?: string
          sold_at?: string | null
          time_signature?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beat_details_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beat_details_preview_track_id_fkey"
            columns: ["preview_track_id"]
            isOneToOne: true
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      beat_exclusive_reservations: {
        Row: {
          buyer_id: string
          completed_at: string | null
          created_at: string
          expires_at: string
          id: string
          idempotency_key: string
          item_id: string
          offer_id: string
          order_id: string | null
          status: string
        }
        Insert: {
          buyer_id: string
          completed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          idempotency_key: string
          item_id: string
          offer_id: string
          order_id?: string | null
          status?: string
        }
        Update: {
          buyer_id?: string
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          idempotency_key?: string
          item_id?: string
          offer_id?: string
          order_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "beat_exclusive_reservations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "beat_details"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "beat_exclusive_reservations_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "catalog_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beat_exclusive_reservations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "commerce_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      beat_files: {
        Row: {
          asset_id: string
          created_at: string
          file_kind: string
          id: string
          item_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          file_kind: string
          id?: string
          item_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          file_kind?: string
          id?: string
          item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beat_files_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: true
            referencedRelation: "item_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beat_files_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "beat_details"
            referencedColumns: ["item_id"]
          },
        ]
      }
      beat_license_download_events: {
        Row: {
          beat_file_id: string
          buyer_id: string
          grant_id: string
          id: string
          ip_hash: string | null
          occurred_at: string
          user_agent: string | null
        }
        Insert: {
          beat_file_id: string
          buyer_id: string
          grant_id: string
          id?: string
          ip_hash?: string | null
          occurred_at?: string
          user_agent?: string | null
        }
        Update: {
          beat_file_id?: string
          buyer_id?: string
          grant_id?: string
          id?: string
          ip_hash?: string | null
          occurred_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beat_license_download_events_beat_file_id_fkey"
            columns: ["beat_file_id"]
            isOneToOne: false
            referencedRelation: "beat_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beat_license_download_events_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "beat_license_grants"
            referencedColumns: ["id"]
          },
        ]
      }
      beat_license_grants: {
        Row: {
          buyer_id: string
          collaborator_snapshot: Json
          created_at: string
          currency: string
          file_manifest: Json
          granted_at: string
          id: string
          is_exclusive: boolean
          item_id: string
          license_number: string
          offer_id: string
          order_item_id: string
          price_cents: number
          seller_id: string
          seller_snapshot: Json
          status: string
          status_changed_at: string
          template_id: string
          terms_sha256: string
          terms_text: string
          tier_code: string
        }
        Insert: {
          buyer_id: string
          collaborator_snapshot: Json
          created_at?: string
          currency: string
          file_manifest: Json
          granted_at?: string
          id?: string
          is_exclusive: boolean
          item_id: string
          license_number: string
          offer_id: string
          order_item_id: string
          price_cents: number
          seller_id: string
          seller_snapshot: Json
          status?: string
          status_changed_at?: string
          template_id: string
          terms_sha256: string
          terms_text: string
          tier_code: string
        }
        Update: {
          buyer_id?: string
          collaborator_snapshot?: Json
          created_at?: string
          currency?: string
          file_manifest?: Json
          granted_at?: string
          id?: string
          is_exclusive?: boolean
          item_id?: string
          license_number?: string
          offer_id?: string
          order_item_id?: string
          price_cents?: number
          seller_id?: string
          seller_snapshot?: Json
          status?: string
          status_changed_at?: string
          template_id?: string
          terms_sha256?: string
          terms_text?: string
          tier_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "beat_license_grants_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beat_license_grants_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "catalog_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beat_license_grants_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: true
            referencedRelation: "commerce_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beat_license_grants_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beat_license_grants_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "beat_license_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      beat_license_offers: {
        Row: {
          created_at: string
          offer_id: string
          template_id: string
        }
        Insert: {
          created_at?: string
          offer_id: string
          template_id: string
        }
        Update: {
          created_at?: string
          offer_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beat_license_offers_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: true
            referencedRelation: "catalog_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beat_license_offers_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "beat_license_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      beat_license_templates: {
        Row: {
          approved_by: string | null
          counsel_approved_at: string | null
          created_at: string
          id: string
          included_file_kinds: string[]
          is_exclusive: boolean
          short_summary: string
          status: string
          terms_sha256: string | null
          terms_text: string
          tier_code: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          approved_by?: string | null
          counsel_approved_at?: string | null
          created_at?: string
          id?: string
          included_file_kinds: string[]
          is_exclusive: boolean
          short_summary: string
          status?: string
          terms_sha256?: string | null
          terms_text: string
          tier_code: string
          title: string
          updated_at?: string
          version: number
        }
        Update: {
          approved_by?: string | null
          counsel_approved_at?: string | null
          created_at?: string
          id?: string
          included_file_kinds?: string[]
          is_exclusive?: boolean
          short_summary?: string
          status?: string
          terms_sha256?: string | null
          terms_text?: string
          tier_code?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "beat_license_templates_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      beat_offer_files: {
        Row: {
          beat_file_id: string
          created_at: string
          offer_id: string
        }
        Insert: {
          beat_file_id: string
          created_at?: string
          offer_id: string
        }
        Update: {
          beat_file_id?: string
          created_at?: string
          offer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beat_offer_files_beat_file_id_fkey"
            columns: ["beat_file_id"]
            isOneToOne: false
            referencedRelation: "beat_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beat_offer_files_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "beat_license_offers"
            referencedColumns: ["offer_id"]
          },
        ]
      }
      beat_runtime_controls: {
        Row: {
          catalog_enabled: boolean
          checkout_enabled: boolean
          exclusive_sales_enabled: boolean
          nonexclusive_pilot_enabled: boolean
          publishing_enabled: boolean
          review_surfaces_enabled: boolean
          singleton: boolean
          split_sales_enabled: boolean
          updated_at: string
        }
        Insert: {
          catalog_enabled?: boolean
          checkout_enabled?: boolean
          exclusive_sales_enabled?: boolean
          nonexclusive_pilot_enabled?: boolean
          publishing_enabled?: boolean
          review_surfaces_enabled?: boolean
          singleton?: boolean
          split_sales_enabled?: boolean
          updated_at?: string
        }
        Update: {
          catalog_enabled?: boolean
          checkout_enabled?: boolean
          exclusive_sales_enabled?: boolean
          nonexclusive_pilot_enabled?: boolean
          publishing_enabled?: boolean
          review_surfaces_enabled?: boolean
          singleton?: boolean
          split_sales_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      book_contents: {
        Row: {
          created_at: string
          file_asset_id: string
          format: string
          item_id: string
          language_code: string | null
          preview_url: string | null
          sample_page_limit: number | null
          total_pages: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_asset_id: string
          format?: string
          item_id: string
          language_code?: string | null
          preview_url?: string | null
          sample_page_limit?: number | null
          total_pages?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_asset_id?: string
          format?: string
          item_id?: string
          language_code?: string | null
          preview_url?: string | null
          sample_page_limit?: number | null
          total_pages?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_contents_file_asset_id_fkey"
            columns: ["file_asset_id"]
            isOneToOne: true
            referencedRelation: "item_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_contents_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_items: {
        Row: {
          author_id: string | null
          available_locally_only: boolean
          cover_url: string | null
          created_at: string
          creator: string
          download_purchase_enabled: boolean
          download_url: string | null
          experience_type: string
          feature_description: string | null
          featured: boolean
          fulfillment_type: string
          hero_url: string | null
          id: string
          is_free: boolean
          item_category_id: string | null
          item_type: string
          launch_url: string | null
          local_currency: string | null
          local_price_cents: number | null
          long_description: string | null
          market_mode: string
          merch_fulfillment_mode: string | null
          merch_shipping_scope: string | null
          price_cents: number
          read_url: string | null
          release_date: string | null
          short_description: string | null
          slug: string
          sort_order: number | null
          status: string
          streaming_enabled: boolean
          tags: string[]
          title: string
          upcoming_release_at: string | null
          upcoming_release_timezone: string | null
          updated_at: string
          year: number | null
        }
        Insert: {
          author_id?: string | null
          available_locally_only?: boolean
          cover_url?: string | null
          created_at?: string
          creator: string
          download_purchase_enabled?: boolean
          download_url?: string | null
          experience_type?: string
          feature_description?: string | null
          featured?: boolean
          fulfillment_type?: string
          hero_url?: string | null
          id?: string
          is_free?: boolean
          item_category_id?: string | null
          item_type: string
          launch_url?: string | null
          local_currency?: string | null
          local_price_cents?: number | null
          long_description?: string | null
          market_mode?: string
          merch_fulfillment_mode?: string | null
          merch_shipping_scope?: string | null
          price_cents?: number
          read_url?: string | null
          release_date?: string | null
          short_description?: string | null
          slug: string
          sort_order?: number | null
          status?: string
          streaming_enabled?: boolean
          tags?: string[]
          title: string
          upcoming_release_at?: string | null
          upcoming_release_timezone?: string | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          author_id?: string | null
          available_locally_only?: boolean
          cover_url?: string | null
          created_at?: string
          creator?: string
          download_purchase_enabled?: boolean
          download_url?: string | null
          experience_type?: string
          feature_description?: string | null
          featured?: boolean
          fulfillment_type?: string
          hero_url?: string | null
          id?: string
          is_free?: boolean
          item_category_id?: string | null
          item_type?: string
          launch_url?: string | null
          local_currency?: string | null
          local_price_cents?: number | null
          long_description?: string | null
          market_mode?: string
          merch_fulfillment_mode?: string | null
          merch_shipping_scope?: string | null
          price_cents?: number
          read_url?: string | null
          release_date?: string | null
          short_description?: string | null
          slug?: string
          sort_order?: number | null
          status?: string
          streaming_enabled?: boolean
          tags?: string[]
          title?: string
          upcoming_release_at?: string | null
          upcoming_release_timezone?: string | null
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_items_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_items_item_category_id_fkey"
            columns: ["item_category_id"]
            isOneToOne: false
            referencedRelation: "item_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_offers: {
        Row: {
          code: string
          created_at: string
          currency: string
          description: string | null
          ends_at: string | null
          fulfillment_type: string
          id: string
          item_id: string
          offer_type: string
          price_cents: number
          quantity_limit: number | null
          starts_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          currency?: string
          description?: string | null
          ends_at?: string | null
          fulfillment_type: string
          id?: string
          item_id: string
          offer_type: string
          price_cents?: number
          quantity_limit?: number | null
          starts_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          currency?: string
          description?: string | null
          ends_at?: string | null
          fulfillment_type?: string
          id?: string
          item_id?: string
          offer_type?: string
          price_cents?: number
          quantity_limit?: number | null
          starts_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_offers_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_adjustments: {
        Row: {
          adjustment_type: string
          amount_cents: number
          created_at: string
          currency: string
          evidence: Json
          id: string
          order_id: string
          payment_attempt_id: string | null
          provider: string
          provider_reference: string
          reason: string | null
          status: string
        }
        Insert: {
          adjustment_type: string
          amount_cents: number
          created_at?: string
          currency: string
          evidence?: Json
          id?: string
          order_id: string
          payment_attempt_id?: string | null
          provider: string
          provider_reference: string
          reason?: string | null
          status: string
        }
        Update: {
          adjustment_type?: string
          amount_cents?: number
          created_at?: string
          currency?: string
          evidence?: Json
          id?: string
          order_id?: string
          payment_attempt_id?: string | null
          provider?: string
          provider_reference?: string
          reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_adjustments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "commerce_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_adjustments_payment_attempt_id_fkey"
            columns: ["payment_attempt_id"]
            isOneToOne: false
            referencedRelation: "payment_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_entitlement_grants: {
        Row: {
          entitlement_id: string
          entitlement_type: string
          granted_at: string
          id: string
          item_id: string
          order_item_id: string
          revoked_at: string | null
          revoked_reason: string | null
          status: string
          user_id: string
        }
        Insert: {
          entitlement_id: string
          entitlement_type: string
          granted_at?: string
          id?: string
          item_id: string
          order_item_id: string
          revoked_at?: string | null
          revoked_reason?: string | null
          status?: string
          user_id: string
        }
        Update: {
          entitlement_id?: string
          entitlement_type?: string
          granted_at?: string
          id?: string
          item_id?: string
          order_item_id?: string
          revoked_at?: string | null
          revoked_reason?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_entitlement_grants_entitlement_id_fkey"
            columns: ["entitlement_id"]
            isOneToOne: false
            referencedRelation: "entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_entitlement_grants_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_entitlement_grants_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "commerce_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_order_addresses: {
        Row: {
          address_line_1: string
          address_line_2: string | null
          city: string
          country_code: string
          created_at: string
          delivery_notes: string | null
          order_id: string
          postal_code: string
          recipient_name: string
          region: string
        }
        Insert: {
          address_line_1: string
          address_line_2?: string | null
          city: string
          country_code: string
          created_at?: string
          delivery_notes?: string | null
          order_id: string
          postal_code: string
          recipient_name: string
          region: string
        }
        Update: {
          address_line_1?: string
          address_line_2?: string | null
          city?: string
          country_code?: string
          created_at?: string
          delivery_notes?: string | null
          order_id?: string
          postal_code?: string
          recipient_name?: string
          region?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_order_addresses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "commerce_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_order_items: {
        Row: {
          created_at: string
          currency: string
          entitlement_snapshot: Json
          fulfillment_status: string
          id: string
          item_id: string
          item_snapshot: Json
          item_title: string
          line_total_cents: number
          merch_variant_id: string | null
          merch_variant_snapshot: Json
          offer_id: string
          offer_snapshot: Json
          offer_title: string
          offer_type: string
          order_id: string
          platform_fee_cents: number
          quantity: number
          seller_id: string | null
          seller_snapshot: Json
          terms_snapshot: Json
          unit_price_cents: number
        }
        Insert: {
          created_at?: string
          currency: string
          entitlement_snapshot?: Json
          fulfillment_status?: string
          id?: string
          item_id: string
          item_snapshot?: Json
          item_title: string
          line_total_cents: number
          merch_variant_id?: string | null
          merch_variant_snapshot?: Json
          offer_id: string
          offer_snapshot?: Json
          offer_title: string
          offer_type: string
          order_id: string
          platform_fee_cents?: number
          quantity?: number
          seller_id?: string | null
          seller_snapshot?: Json
          terms_snapshot?: Json
          unit_price_cents: number
        }
        Update: {
          created_at?: string
          currency?: string
          entitlement_snapshot?: Json
          fulfillment_status?: string
          id?: string
          item_id?: string
          item_snapshot?: Json
          item_title?: string
          line_total_cents?: number
          merch_variant_id?: string | null
          merch_variant_snapshot?: Json
          offer_id?: string
          offer_snapshot?: Json
          offer_title?: string
          offer_type?: string
          order_id?: string
          platform_fee_cents?: number
          quantity?: number
          seller_id?: string | null
          seller_snapshot?: Json
          terms_snapshot?: Json
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "commerce_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_order_items_merch_variant_id_fkey"
            columns: ["merch_variant_id"]
            isOneToOne: false
            referencedRelation: "merch_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_order_items_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "catalog_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "commerce_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_order_items_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_orders: {
        Row: {
          buyer_id: string
          canceled_at: string | null
          checkout_expires_at: string | null
          created_at: string
          currency: string
          customer_email_snapshot: string | null
          discount_cents: number
          disputed_cents: number
          failure_code: string | null
          failure_message: string | null
          id: string
          idempotency_key: string
          paid_at: string | null
          placed_at: string | null
          platform_fee_bps: number
          provider: string | null
          provider_order_id: string | null
          refunded_cents: number
          shipping_cents: number
          status: string
          subtotal_cents: number
          tax_cents: number
          terms_sha256: string | null
          terms_version_id: string | null
          total_cents: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          canceled_at?: string | null
          checkout_expires_at?: string | null
          created_at?: string
          currency?: string
          customer_email_snapshot?: string | null
          discount_cents?: number
          disputed_cents?: number
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          idempotency_key?: string
          paid_at?: string | null
          placed_at?: string | null
          platform_fee_bps?: number
          provider?: string | null
          provider_order_id?: string | null
          refunded_cents?: number
          shipping_cents?: number
          status?: string
          subtotal_cents?: number
          tax_cents?: number
          terms_sha256?: string | null
          terms_version_id?: string | null
          total_cents?: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          canceled_at?: string | null
          checkout_expires_at?: string | null
          created_at?: string
          currency?: string
          customer_email_snapshot?: string | null
          discount_cents?: number
          disputed_cents?: number
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          idempotency_key?: string
          paid_at?: string | null
          placed_at?: string | null
          platform_fee_bps?: number
          provider?: string | null
          provider_order_id?: string | null
          refunded_cents?: number
          shipping_cents?: number
          status?: string
          subtotal_cents?: number
          tax_cents?: number
          terms_sha256?: string | null
          terms_version_id?: string | null
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_orders_terms_version_id_fkey"
            columns: ["terms_version_id"]
            isOneToOne: false
            referencedRelation: "commerce_terms_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_reconciliation_runs: {
        Row: {
          checked_count: number
          completed_at: string | null
          id: string
          mismatch_count: number
          provider: string
          scope: string
          started_at: string
          status: string
          summary: Json
          window_end: string
          window_start: string
        }
        Insert: {
          checked_count?: number
          completed_at?: string | null
          id?: string
          mismatch_count?: number
          provider: string
          scope: string
          started_at?: string
          status?: string
          summary?: Json
          window_end: string
          window_start: string
        }
        Update: {
          checked_count?: number
          completed_at?: string | null
          id?: string
          mismatch_count?: number
          provider?: string
          scope?: string
          started_at?: string
          status?: string
          summary?: Json
          window_end?: string
          window_start?: string
        }
        Relationships: []
      }
      commerce_runtime_controls: {
        Row: {
          approved_by: string | null
          checkout_enabled: boolean
          launch_scope: string
          operating_model_approved_at: string | null
          paypal_payouts_enabled: boolean
          platform_fee_bps: number
          platform_seller_id: string | null
          shipping_countries: string[]
          singleton: boolean
          stripe_payments_enabled: boolean
          terms_version_id: string | null
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          checkout_enabled?: boolean
          launch_scope?: string
          operating_model_approved_at?: string | null
          paypal_payouts_enabled?: boolean
          platform_fee_bps?: number
          platform_seller_id?: string | null
          shipping_countries?: string[]
          singleton?: boolean
          stripe_payments_enabled?: boolean
          terms_version_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          checkout_enabled?: boolean
          launch_scope?: string
          operating_model_approved_at?: string | null
          paypal_payouts_enabled?: boolean
          platform_fee_bps?: number
          platform_seller_id?: string | null
          shipping_countries?: string[]
          singleton?: boolean
          stripe_payments_enabled?: boolean
          terms_version_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_runtime_controls_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_runtime_controls_platform_seller_id_fkey"
            columns: ["platform_seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_runtime_controls_terms_version_fkey"
            columns: ["terms_version_id"]
            isOneToOne: false
            referencedRelation: "commerce_terms_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_terms_versions: {
        Row: {
          approved_by: string | null
          body: string
          body_sha256: string
          code: string
          created_at: string
          effective_at: string | null
          id: string
          status: string
          title: string
          version: string
        }
        Insert: {
          approved_by?: string | null
          body: string
          body_sha256: string
          code: string
          created_at?: string
          effective_at?: string | null
          id?: string
          status?: string
          title: string
          version: string
        }
        Update: {
          approved_by?: string | null
          body?: string
          body_sha256?: string
          code?: string
          created_at?: string
          effective_at?: string | null
          id?: string
          status?: string
          title?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_terms_versions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_collaboration_responses: {
        Row: {
          author_id: string
          body: string
          collaboration_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          collaboration_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          collaboration_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_collaboration_responses_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_collaboration_responses_collaboration_id_fkey"
            columns: ["collaboration_id"]
            isOneToOne: false
            referencedRelation: "community_collaborations"
            referencedColumns: ["id"]
          },
        ]
      }
      community_collaborations: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          project_type: string | null
          role_needed: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          project_type?: string | null
          role_needed?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          project_type?: string | null
          role_needed?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_collaborations_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_question_answers: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          is_accepted: boolean
          question_id: string
          updated_at: string
          vote_count: number
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          is_accepted?: boolean
          question_id: string
          updated_at?: string
          vote_count?: number
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          is_accepted?: boolean
          question_id?: string
          updated_at?: string
          vote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "community_question_answers_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_question_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "community_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      community_question_votes: {
        Row: {
          answer_id: string | null
          created_at: string
          id: string
          profile_id: string
          question_id: string | null
          value: number
        }
        Insert: {
          answer_id?: string | null
          created_at?: string
          id?: string
          profile_id: string
          question_id?: string | null
          value?: number
        }
        Update: {
          answer_id?: string | null
          created_at?: string
          id?: string
          profile_id?: string
          question_id?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "community_question_votes_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "community_question_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_question_votes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_question_votes_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "community_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      community_questions: {
        Row: {
          accepted_answer_id: string | null
          answer_count: number
          author_id: string
          body: string
          created_at: string
          has_accepted_answer: boolean
          id: string
          status: string
          tags: string[]
          title: string
          updated_at: string
          vote_count: number
        }
        Insert: {
          accepted_answer_id?: string | null
          answer_count?: number
          author_id: string
          body: string
          created_at?: string
          has_accepted_answer?: boolean
          id?: string
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
          vote_count?: number
        }
        Update: {
          accepted_answer_id?: string | null
          answer_count?: number
          author_id?: string
          body?: string
          created_at?: string
          has_accepted_answer?: boolean
          id?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          vote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "community_questions_accepted_answer_id_fkey"
            columns: ["accepted_answer_id"]
            isOneToOne: false
            referencedRelation: "community_question_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_questions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_rate_events: {
        Row: {
          action_key: string
          actor_id: string
          created_at: string
          id: number
        }
        Insert: {
          action_key: string
          actor_id: string
          created_at?: string
          id?: number
        }
        Update: {
          action_key?: string
          actor_id?: string
          created_at?: string
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "community_rate_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_collaboration_details: {
        Row: {
          collaboration_status: string
          created_at: string
          entry_id: string
          project_type: string | null
          role_needed: string | null
          updated_at: string
        }
        Insert: {
          collaboration_status?: string
          created_at?: string
          entry_id: string
          project_type?: string | null
          role_needed?: string | null
          updated_at?: string
        }
        Update: {
          collaboration_status?: string
          created_at?: string
          entry_id?: string
          project_type?: string | null
          role_needed?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_collaboration_details_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "community_collaboration_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_collaboration_details_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "community_discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_collaboration_details_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "community_question_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_collaboration_details_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "community_review_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_collaboration_details_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "community_update_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_collaboration_details_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "content_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      content_entries: {
        Row: {
          author_id: string | null
          body: string | null
          content_type: string
          created_at: string
          id: string
          item_id: string | null
          moderation_status: string
          publication_status: string
          slug: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body?: string | null
          content_type: string
          created_at?: string
          id?: string
          item_id?: string | null
          moderation_status?: string
          publication_status?: string
          slug?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string | null
          content_type?: string
          created_at?: string
          id?: string
          item_id?: string | null
          moderation_status?: string
          publication_status?: string
          slug?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_entries_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_entries_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      content_entry_reactions: {
        Row: {
          created_at: string
          entry_id: string
          profile_id: string
          reaction_type: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          profile_id: string
          reaction_type?: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          profile_id?: string
          reaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_entry_reactions_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "community_collaboration_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_entry_reactions_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "community_discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_entry_reactions_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "community_question_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_entry_reactions_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "community_review_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_entry_reactions_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "community_update_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_entry_reactions_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "content_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_entry_reactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_question_details: {
        Row: {
          accepted_reply_id: string | null
          answer_count: number
          created_at: string
          entry_id: string
          question_status: string
          tags: string[]
          updated_at: string
          vote_count: number
        }
        Insert: {
          accepted_reply_id?: string | null
          answer_count?: number
          created_at?: string
          entry_id: string
          question_status?: string
          tags?: string[]
          updated_at?: string
          vote_count?: number
        }
        Update: {
          accepted_reply_id?: string | null
          answer_count?: number
          created_at?: string
          entry_id?: string
          question_status?: string
          tags?: string[]
          updated_at?: string
          vote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_question_details_accepted_reply_id_fkey"
            columns: ["accepted_reply_id"]
            isOneToOne: false
            referencedRelation: "community_collaboration_response_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_question_details_accepted_reply_id_fkey"
            columns: ["accepted_reply_id"]
            isOneToOne: false
            referencedRelation: "community_discussion_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_question_details_accepted_reply_id_fkey"
            columns: ["accepted_reply_id"]
            isOneToOne: false
            referencedRelation: "community_question_answer_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_question_details_accepted_reply_id_fkey"
            columns: ["accepted_reply_id"]
            isOneToOne: false
            referencedRelation: "content_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_question_details_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "community_collaboration_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_question_details_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "community_discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_question_details_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "community_question_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_question_details_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "community_review_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_question_details_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "community_update_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_question_details_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "content_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      content_replies: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          entry_id: string
          id: string
          is_accepted: boolean
          moderation_status: string
          parent_reply_id: string | null
          publication_status: string
          reply_type: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          entry_id: string
          id?: string
          is_accepted?: boolean
          moderation_status?: string
          parent_reply_id?: string | null
          publication_status?: string
          reply_type?: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          entry_id?: string
          id?: string
          is_accepted?: boolean
          moderation_status?: string
          parent_reply_id?: string | null
          publication_status?: string
          reply_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_replies_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "community_collaboration_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_replies_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "community_discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_replies_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "community_question_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_replies_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "community_review_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_replies_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "community_update_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_replies_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "content_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_replies_parent_reply_id_fkey"
            columns: ["parent_reply_id"]
            isOneToOne: false
            referencedRelation: "community_collaboration_response_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_replies_parent_reply_id_fkey"
            columns: ["parent_reply_id"]
            isOneToOne: false
            referencedRelation: "community_discussion_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_replies_parent_reply_id_fkey"
            columns: ["parent_reply_id"]
            isOneToOne: false
            referencedRelation: "community_question_answer_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_replies_parent_reply_id_fkey"
            columns: ["parent_reply_id"]
            isOneToOne: false
            referencedRelation: "content_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reply_reactions: {
        Row: {
          created_at: string
          profile_id: string
          reaction_type: string
          reply_id: string
        }
        Insert: {
          created_at?: string
          profile_id: string
          reaction_type?: string
          reply_id: string
        }
        Update: {
          created_at?: string
          profile_id?: string
          reaction_type?: string
          reply_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_reply_reactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reply_reactions_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "community_collaboration_response_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reply_reactions_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "community_discussion_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reply_reactions_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "community_question_answer_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reply_reactions_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "content_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reports: {
        Row: {
          created_at: string
          details: string | null
          entry_id: string | null
          id: string
          reason: string
          reply_id: string | null
          reporter_id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          entry_id?: string | null
          id?: string
          reason: string
          reply_id?: string | null
          reporter_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          entry_id?: string | null
          id?: string
          reason?: string
          reply_id?: string | null
          reporter_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_reports_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "community_collaboration_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "community_discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "community_question_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "community_review_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "community_update_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "content_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "community_collaboration_response_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "community_discussion_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "community_question_answer_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "content_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_review_details: {
        Row: {
          created_at: string
          entry_id: string
          rating: number | null
          sentiment: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          rating?: number | null
          sentiment?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          rating?: number | null
          sentiment?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_review_details_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "community_collaboration_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_review_details_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "community_discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_review_details_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "community_question_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_review_details_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "community_review_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_review_details_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "community_update_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_review_details_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "content_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      content_update_details: {
        Row: {
          created_at: string
          entry_id: string
          updated_at: string
          version_label: string | null
        }
        Insert: {
          created_at?: string
          entry_id: string
          updated_at?: string
          version_label?: string | null
        }
        Update: {
          created_at?: string
          entry_id?: string
          updated_at?: string
          version_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_update_details_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "community_collaboration_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_update_details_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "community_discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_update_details_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "community_question_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_update_details_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "community_review_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_update_details_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "community_update_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_update_details_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "content_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          archived_at: string | null
          conversation_id: string
          created_at: string
          last_read_at: string | null
          profile_id: string
        }
        Insert: {
          archived_at?: string | null
          conversation_id: string
          created_at?: string
          last_read_at?: string | null
          profile_id: string
        }
        Update: {
          archived_at?: string | null
          conversation_id?: string
          created_at?: string
          last_read_at?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          conversation_key: string
          created_at: string
          created_by: string | null
          id: string
          updated_at: string
        }
        Insert: {
          conversation_key: string
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          conversation_key?: string
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_earnings_entries: {
        Row: {
          amount_cents: number
          available_at: string | null
          created_at: string
          creator_id: string
          currency: string
          entry_type: string
          id: string
          metadata: Json
          order_item_id: string | null
          source_provider: string | null
          source_reference: string | null
        }
        Insert: {
          amount_cents: number
          available_at?: string | null
          created_at?: string
          creator_id: string
          currency: string
          entry_type: string
          id?: string
          metadata?: Json
          order_item_id?: string | null
          source_provider?: string | null
          source_reference?: string | null
        }
        Update: {
          amount_cents?: number
          available_at?: string | null
          created_at?: string
          creator_id?: string
          currency?: string
          entry_type?: string
          id?: string
          metadata?: Json
          order_item_id?: string | null
          source_provider?: string | null
          source_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_earnings_entries_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_earnings_entries_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "commerce_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_events: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          country_code: string | null
          created_at: string
          creator_id: string
          ends_at: string | null
          format: string
          id: string
          info_url: string | null
          lifecycle_state: string
          locality: string | null
          moderated_at: string | null
          moderated_by: string | null
          moderation_reason: string | null
          moderation_state: string
          online_url: string | null
          postal_code: string | null
          region: string | null
          short_description: string
          starts_at: string
          timezone: string
          title: string
          updated_at: string
          venue_name: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          country_code?: string | null
          created_at?: string
          creator_id: string
          ends_at?: string | null
          format: string
          id?: string
          info_url?: string | null
          lifecycle_state?: string
          locality?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_state?: string
          online_url?: string | null
          postal_code?: string | null
          region?: string | null
          short_description: string
          starts_at: string
          timezone: string
          title: string
          updated_at?: string
          venue_name?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          country_code?: string | null
          created_at?: string
          creator_id?: string
          ends_at?: string | null
          format?: string
          id?: string
          info_url?: string | null
          lifecycle_state?: string
          locality?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_state?: string
          online_url?: string | null
          postal_code?: string | null
          region?: string | null
          short_description?: string
          starts_at?: string
          timezone?: string
          title?: string
          updated_at?: string
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_events_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_paid_sales_access: {
        Row: {
          admin_status: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          creator_id: string
          decision_reason: string | null
          disabled_at: string | null
          paperwork_due_at: string | null
          updated_at: string
        }
        Insert: {
          admin_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          creator_id: string
          decision_reason?: string | null
          disabled_at?: string | null
          paperwork_due_at?: string | null
          updated_at?: string
        }
        Update: {
          admin_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          creator_id?: string
          decision_reason?: string | null
          disabled_at?: string | null
          paperwork_due_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_paid_sales_access_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_paid_sales_access_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_paid_sales_access_events: {
        Row: {
          changed_by: string | null
          created_at: string
          creator_id: string
          id: string
          new_status: string
          previous_status: string | null
          reason: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          creator_id: string
          id?: string
          new_status: string
          previous_status?: string | null
          reason: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          creator_id?: string
          id?: string
          new_status?: string
          previous_status?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_paid_sales_access_events_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_paid_sales_access_events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_payout_accounts: {
        Row: {
          capabilities: Json
          created_at: string
          creator_id: string
          disabled_at: string | null
          id: string
          last_provider_sync_at: string | null
          preferred_currency: string | null
          provider: string
          provider_recipient_ref: string | null
          recipient_country_code: string | null
          requirements_due: string[]
          status: string
          status_reason_code: string | null
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          capabilities?: Json
          created_at?: string
          creator_id: string
          disabled_at?: string | null
          id?: string
          last_provider_sync_at?: string | null
          preferred_currency?: string | null
          provider: string
          provider_recipient_ref?: string | null
          recipient_country_code?: string | null
          requirements_due?: string[]
          status?: string
          status_reason_code?: string | null
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          capabilities?: Json
          created_at?: string
          creator_id?: string
          disabled_at?: string | null
          id?: string
          last_provider_sync_at?: string | null
          preferred_currency?: string | null
          provider?: string
          provider_recipient_ref?: string | null
          recipient_country_code?: string | null
          requirements_due?: string[]
          status?: string
          status_reason_code?: string | null
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_payout_accounts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_payout_batches: {
        Row: {
          approval_digest: string | null
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          created_at: string
          currency: string
          cutoff_at: string | null
          gross_total_cents: number
          id: string
          idempotency_key: string
          item_count: number
          membership_locked_at: string | null
          policy_version: number | null
          provider: string
          provider_batch_id: string | null
          reconciled_at: string | null
          reconciled_by: string | null
          reconciliation_digest: string | null
          source_currency: string | null
          status: string
          submitted_at: string | null
          total_cents: number
          updated_at: string
          withheld_tax_total_cents: number
        }
        Insert: {
          approval_digest?: string | null
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          currency: string
          cutoff_at?: string | null
          gross_total_cents?: number
          id?: string
          idempotency_key: string
          item_count?: number
          membership_locked_at?: string | null
          policy_version?: number | null
          provider: string
          provider_batch_id?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_digest?: string | null
          source_currency?: string | null
          status?: string
          submitted_at?: string | null
          total_cents?: number
          updated_at?: string
          withheld_tax_total_cents?: number
        }
        Update: {
          approval_digest?: string | null
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          cutoff_at?: string | null
          gross_total_cents?: number
          id?: string
          idempotency_key?: string
          item_count?: number
          membership_locked_at?: string | null
          policy_version?: number | null
          provider?: string
          provider_batch_id?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_digest?: string | null
          source_currency?: string | null
          status?: string
          submitted_at?: string | null
          total_cents?: number
          updated_at?: string
          withheld_tax_total_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "creator_payout_batches_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_payout_batches_reconciled_by_fkey"
            columns: ["reconciled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_payout_capability_events: {
        Row: {
          country_code: string | null
          created_at: string
          creator_id: string
          currency: string | null
          id: string
          new_status: string
          previous_status: string | null
          provider: string
          reason_code: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          creator_id: string
          currency?: string | null
          id?: string
          new_status: string
          previous_status?: string | null
          provider: string
          reason_code?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string
          creator_id?: string
          currency?: string | null
          id?: string
          new_status?: string
          previous_status?: string | null
          provider?: string
          reason_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_payout_capability_events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_payout_country_routes: {
        Row: {
          business_to_individual_confirmed: boolean
          country_code: string
          created_at: string
          email_claim_confirmed: boolean
          evidence_reference: string | null
          id: string
          method: string
          revalidate_after: string | null
          status: string
          suspended_at: string | null
          target_currency: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          business_to_individual_confirmed?: boolean
          country_code: string
          created_at?: string
          email_claim_confirmed?: boolean
          evidence_reference?: string | null
          id?: string
          method?: string
          revalidate_after?: string | null
          status?: string
          suspended_at?: string | null
          target_currency: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          business_to_individual_confirmed?: boolean
          country_code?: string
          created_at?: string
          email_claim_confirmed?: boolean
          evidence_reference?: string | null
          id?: string
          method?: string
          revalidate_after?: string | null
          status?: string
          suspended_at?: string | null
          target_currency?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_payout_country_routes_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_payout_destination_access_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          destination_id: string
          id: string
          purpose: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          destination_id: string
          id?: string
          purpose: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          destination_id?: string
          id?: string
          purpose?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_payout_destination_access_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_payout_destination_access_events_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "creator_payout_destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_payout_destinations: {
        Row: {
          auth_tag: string
          ciphertext: string
          country_code: string
          created_at: string
          creator_id: string
          currency: string
          destination_type: string
          encryption_key_version: number
          id: string
          immutable_digest: string
          initialization_vector: string
          masked_display: string
          replaced_at: string | null
          route_id: string
          status: string
          verified_at: string | null
          version: number
        }
        Insert: {
          auth_tag: string
          ciphertext: string
          country_code: string
          created_at?: string
          creator_id: string
          currency: string
          destination_type?: string
          encryption_key_version: number
          id?: string
          immutable_digest: string
          initialization_vector: string
          masked_display: string
          replaced_at?: string | null
          route_id: string
          status?: string
          verified_at?: string | null
          version: number
        }
        Update: {
          auth_tag?: string
          ciphertext?: string
          country_code?: string
          created_at?: string
          creator_id?: string
          currency?: string
          destination_type?: string
          encryption_key_version?: number
          id?: string
          immutable_digest?: string
          initialization_vector?: string
          masked_display?: string
          replaced_at?: string | null
          route_id?: string
          status?: string
          verified_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "creator_payout_destinations_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_payout_destinations_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "creator_payout_country_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_payout_item_earnings: {
        Row: {
          amount_cents: number
          created_at: string
          earnings_entry_id: string
          payout_item_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          earnings_entry_id: string
          payout_item_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          earnings_entry_id?: string
          payout_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_payout_item_earnings_earnings_entry_id_fkey"
            columns: ["earnings_entry_id"]
            isOneToOne: true
            referencedRelation: "creator_earnings_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_payout_item_earnings_payout_item_id_fkey"
            columns: ["payout_item_id"]
            isOneToOne: false
            referencedRelation: "creator_payout_items"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_payout_items: {
        Row: {
          amount_cents: number
          batch_id: string
          completed_at: string | null
          created_at: string
          creator_id: string
          currency: string
          destination_snapshot: string | null
          exchange_rate: number | null
          failure_code: string | null
          failure_message: string | null
          gross_payable_cents: number | null
          id: string
          operator_recorded_at: string | null
          operator_recorded_by: string | null
          payout_account_id: string
          payout_fee_cents: number
          provider_evidence_digest: string | null
          provider_item_id: string | null
          reconciled_at: string | null
          reconciled_by: string | null
          reconciliation_digest: string | null
          sender_item_id: string
          source_amount_cents: number | null
          source_currency: string | null
          status: string
          target_amount_minor: number | null
          target_currency: string | null
          updated_at: string
          wise_transfer_reference: string | null
          withheld_tax_cents: number
          withholding_reason: string | null
        }
        Insert: {
          amount_cents: number
          batch_id: string
          completed_at?: string | null
          created_at?: string
          creator_id: string
          currency: string
          destination_snapshot?: string | null
          exchange_rate?: number | null
          failure_code?: string | null
          failure_message?: string | null
          gross_payable_cents?: number | null
          id?: string
          operator_recorded_at?: string | null
          operator_recorded_by?: string | null
          payout_account_id: string
          payout_fee_cents?: number
          provider_evidence_digest?: string | null
          provider_item_id?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_digest?: string | null
          sender_item_id: string
          source_amount_cents?: number | null
          source_currency?: string | null
          status?: string
          target_amount_minor?: number | null
          target_currency?: string | null
          updated_at?: string
          wise_transfer_reference?: string | null
          withheld_tax_cents?: number
          withholding_reason?: string | null
        }
        Update: {
          amount_cents?: number
          batch_id?: string
          completed_at?: string | null
          created_at?: string
          creator_id?: string
          currency?: string
          destination_snapshot?: string | null
          exchange_rate?: number | null
          failure_code?: string | null
          failure_message?: string | null
          gross_payable_cents?: number | null
          id?: string
          operator_recorded_at?: string | null
          operator_recorded_by?: string | null
          payout_account_id?: string
          payout_fee_cents?: number
          provider_evidence_digest?: string | null
          provider_item_id?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_digest?: string | null
          sender_item_id?: string
          source_amount_cents?: number | null
          source_currency?: string | null
          status?: string
          target_amount_minor?: number | null
          target_currency?: string | null
          updated_at?: string
          wise_transfer_reference?: string | null
          withheld_tax_cents?: number
          withholding_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_payout_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "creator_payout_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_payout_items_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_payout_items_operator_recorded_by_fkey"
            columns: ["operator_recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_payout_items_payout_account_id_fkey"
            columns: ["payout_account_id"]
            isOneToOne: false
            referencedRelation: "creator_payout_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_payout_items_reconciled_by_fkey"
            columns: ["reconciled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_payout_manual_evidence: {
        Row: {
          evidence_digest: string
          evidence_type: string
          id: string
          metadata: Json
          payout_item_id: string
          provider_reference: string | null
          recorded_at: string
          recorded_by: string
        }
        Insert: {
          evidence_digest: string
          evidence_type: string
          id?: string
          metadata?: Json
          payout_item_id: string
          provider_reference?: string | null
          recorded_at?: string
          recorded_by: string
        }
        Update: {
          evidence_digest?: string
          evidence_type?: string
          id?: string
          metadata?: Json
          payout_item_id?: string
          provider_reference?: string | null
          recorded_at?: string
          recorded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_payout_manual_evidence_payout_item_id_fkey"
            columns: ["payout_item_id"]
            isOneToOne: false
            referencedRelation: "creator_payout_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_payout_manual_evidence_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_payout_runtime_controls: {
        Row: {
          approved_by: string | null
          batching_enabled: boolean
          emergency_stop: boolean
          minimum_payout_cents: number
          operator_recording_enabled: boolean
          policy_approved_at: string | null
          policy_version: number
          reconciliation_enabled: boolean
          selected_provider: string
          singleton: boolean
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          batching_enabled?: boolean
          emergency_stop?: boolean
          minimum_payout_cents?: number
          operator_recording_enabled?: boolean
          policy_approved_at?: string | null
          policy_version?: number
          reconciliation_enabled?: boolean
          selected_provider?: string
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          batching_enabled?: boolean
          emergency_stop?: boolean
          minimum_payout_cents?: number
          operator_recording_enabled?: boolean
          policy_approved_at?: string | null
          policy_version?: number
          reconciliation_enabled?: boolean
          selected_provider?: string
          singleton?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_payout_runtime_controls_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_seller_notifications: {
        Row: {
          body: string
          created_at: string
          creator_id: string
          event_key: string
          href: string
          id: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          creator_id: string
          event_key: string
          href?: string
          id?: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          creator_id?: string
          event_key?: string
          href?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_seller_notifications_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_seller_onboarding: {
        Row: {
          creator_id: string
          policy_version: number | null
          promoted_at: string
          ready_at: string | null
          seller_type: string
          special_case: string
          started_at: string | null
          status: string
          suspended_at: string | null
          updated_at: string
          us_person_status: string
        }
        Insert: {
          creator_id: string
          policy_version?: number | null
          promoted_at?: string
          ready_at?: string | null
          seller_type?: string
          special_case?: string
          started_at?: string | null
          status?: string
          suspended_at?: string | null
          updated_at?: string
          us_person_status?: string
        }
        Update: {
          creator_id?: string
          policy_version?: number | null
          promoted_at?: string
          ready_at?: string | null
          seller_type?: string
          special_case?: string
          started_at?: string | null
          status?: string
          suspended_at?: string | null
          updated_at?: string
          us_person_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_seller_onboarding_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_tax_access_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          document_id: string
          id: string
          purpose: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          document_id: string
          id?: string
          purpose: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          document_id?: string
          id?: string
          purpose?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_tax_access_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_tax_access_events_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "creator_tax_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_tax_document_payloads: {
        Row: {
          auth_tag: string
          byte_length: number
          ciphertext: string
          content_type: string
          created_at: string
          document_id: string
          encryption_key_version: number
          initialization_vector: string
        }
        Insert: {
          auth_tag: string
          byte_length: number
          ciphertext: string
          content_type?: string
          created_at?: string
          document_id: string
          encryption_key_version: number
          initialization_vector: string
        }
        Update: {
          auth_tag?: string
          byte_length?: number
          ciphertext?: string
          content_type?: string
          created_at?: string
          document_id?: string
          encryption_key_version?: number
          initialization_vector?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_tax_document_payloads_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "creator_tax_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_tax_documents: {
        Row: {
          change_in_circumstances_at: string | null
          creator_id: string
          expires_at: string | null
          form_revision: string
          form_type: string
          id: string
          immutable_digest: string
          review_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          signature_captured: boolean
          signed_at: string
          status: string
          submitted_at: string
          supersedes_id: string | null
        }
        Insert: {
          change_in_circumstances_at?: string | null
          creator_id: string
          expires_at?: string | null
          form_revision: string
          form_type: string
          id?: string
          immutable_digest: string
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          signature_captured: boolean
          signed_at: string
          status?: string
          submitted_at?: string
          supersedes_id?: string | null
        }
        Update: {
          change_in_circumstances_at?: string | null
          creator_id?: string
          expires_at?: string | null
          form_revision?: string
          form_type?: string
          id?: string
          immutable_digest?: string
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          signature_captured?: boolean
          signed_at?: string
          status?: string
          submitted_at?: string
          supersedes_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_tax_documents_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_tax_documents_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_tax_documents_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "creator_tax_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_tax_policy: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          foreign_w8ben_required_before_selling: boolean
          income_classification: string | null
          professional_reference: string | null
          singleton: boolean
          updated_at: string
          us_w9_required_before_selling: boolean
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          foreign_w8ben_required_before_selling?: boolean
          income_classification?: string | null
          professional_reference?: string | null
          singleton?: boolean
          updated_at?: string
          us_w9_required_before_selling?: boolean
          version?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          foreign_w8ben_required_before_selling?: boolean
          income_classification?: string | null
          professional_reference?: string | null
          singleton?: boolean
          updated_at?: string
          us_w9_required_before_selling?: boolean
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "creator_tax_policy_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_tax_reviewers: {
        Row: {
          approved_at: string
          approved_by: string
          disabled_at: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string
          approved_by: string
          disabled_at?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string
          approved_by?: string
          disabled_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_tax_reviewers_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_tax_reviewers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_control_events: {
        Row: {
          changed_by: string
          control_name: string
          created_at: string
          id: string
          new_enabled: boolean
          previous_enabled: boolean
          reason: string
        }
        Insert: {
          changed_by: string
          control_name: string
          created_at?: string
          id?: string
          new_enabled: boolean
          previous_enabled: boolean
          reason: string
        }
        Update: {
          changed_by?: string
          control_name?: string
          created_at?: string
          id?: string
          new_enabled?: boolean
          previous_enabled?: boolean
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_control_events_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_delivery_controls: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          delivery_enabled: boolean
          newsletter_sync_enabled: boolean
          singleton: boolean
          support_intake_enabled: boolean
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          delivery_enabled?: boolean
          newsletter_sync_enabled?: boolean
          singleton?: boolean
          support_intake_enabled?: boolean
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          delivery_enabled?: boolean
          newsletter_sync_enabled?: boolean
          singleton?: boolean
          support_intake_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_delivery_controls_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_outbox_events: {
        Row: {
          attempt_count: number
          claim_token: string | null
          claimed_at: string | null
          created_at: string
          event_key: string
          id: string
          last_error_at: string | null
          last_error_code: string | null
          next_attempt_at: string
          payload: Json
          provider_message_id: string | null
          recipient_email: string
          recipient_user_id: string | null
          sent_at: string | null
          source_id: string | null
          source_kind: string
          status: string
          template_key: string
          template_version: number
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          claim_token?: string | null
          claimed_at?: string | null
          created_at?: string
          event_key: string
          id?: string
          last_error_at?: string | null
          last_error_code?: string | null
          next_attempt_at?: string
          payload: Json
          provider_message_id?: string | null
          recipient_email: string
          recipient_user_id?: string | null
          sent_at?: string | null
          source_id?: string | null
          source_kind: string
          status?: string
          template_key: string
          template_version: number
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          claim_token?: string | null
          claimed_at?: string | null
          created_at?: string
          event_key?: string
          id?: string
          last_error_at?: string | null
          last_error_code?: string | null
          next_attempt_at?: string
          payload?: Json
          provider_message_id?: string | null
          recipient_email?: string
          recipient_user_id?: string | null
          sent_at?: string | null
          source_id?: string | null
          source_kind?: string
          status?: string
          template_key?: string
          template_version?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_provider_events: {
        Row: {
          event_type: string
          failure_class: string | null
          id: string
          metadata: Json
          occurred_at: string | null
          provider: string
          provider_event_id: string
          provider_message_id: string | null
          received_at: string
        }
        Insert: {
          event_type: string
          failure_class?: string | null
          id?: string
          metadata?: Json
          occurred_at?: string | null
          provider: string
          provider_event_id: string
          provider_message_id?: string | null
          received_at?: string
        }
        Update: {
          event_type?: string
          failure_class?: string | null
          id?: string
          metadata?: Json
          occurred_at?: string | null
          provider?: string
          provider_event_id?: string
          provider_message_id?: string | null
          received_at?: string
        }
        Relationships: []
      }
      email_reconciliation_events: {
        Row: {
          created_at: string
          id: string
          outbox_event_id: string
          previous_error_code: string
          provider_message_id: string | null
          reason: string
          reconciled_by: string
          resolution: string
        }
        Insert: {
          created_at?: string
          id?: string
          outbox_event_id: string
          previous_error_code: string
          provider_message_id?: string | null
          reason: string
          reconciled_by: string
          resolution: string
        }
        Update: {
          created_at?: string
          id?: string
          outbox_event_id?: string
          previous_error_code?: string
          provider_message_id?: string | null
          reason?: string
          reconciled_by?: string
          resolution?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_reconciliation_events_outbox_event_id_fkey"
            columns: ["outbox_event_id"]
            isOneToOne: false
            referencedRelation: "email_outbox_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_reconciliation_events_reconciled_by_fkey"
            columns: ["reconciled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_suppressions: {
        Row: {
          email_normalized: string
          reason: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_provider_event_id: string | null
          suppressed_at: string
        }
        Insert: {
          email_normalized: string
          reason: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_provider_event_id?: string | null
          suppressed_at?: string
        }
        Update: {
          email_normalized?: string
          reason?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_provider_event_id?: string | null
          suppressed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_suppressions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_suppressions_source_provider_event_id_fkey"
            columns: ["source_provider_event_id"]
            isOneToOne: false
            referencedRelation: "email_provider_events"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlement_events: {
        Row: {
          actor_id: string | null
          created_at: string
          entitlement_id: string
          entitlement_type: string
          id: string
          item_id: string
          metadata: Json
          operation: string
          reason: string | null
          source_id: string | null
          source_type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entitlement_id: string
          entitlement_type: string
          id?: string
          item_id: string
          metadata?: Json
          operation: string
          reason?: string | null
          source_id?: string | null
          source_type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entitlement_id?: string
          entitlement_type?: string
          id?: string
          item_id?: string
          metadata?: Json
          operation?: string
          reason?: string | null
          source_id?: string | null
          source_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entitlement_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlement_events_entitlement_id_fkey"
            columns: ["entitlement_id"]
            isOneToOne: false
            referencedRelation: "entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlement_events_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlements: {
        Row: {
          created_at: string
          entitlement_type: string
          expires_at: string | null
          granted_at: string
          id: string
          item_id: string
          revoked_at: string | null
          source_id: string | null
          source_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entitlement_type: string
          expires_at?: string | null
          granted_at?: string
          id?: string
          item_id: string
          revoked_at?: string | null
          source_id?: string | null
          source_type: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entitlement_type?: string
          expires_at?: string | null
          granted_at?: string
          id?: string
          item_id?: string
          revoked_at?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entitlements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          currency: string
          updated_at: string
          usd_rate: number
        }
        Insert: {
          currency: string
          updated_at?: string
          usd_rate: number
        }
        Update: {
          currency?: string
          updated_at?: string
          usd_rate?: number
        }
        Relationships: []
      }
      external_link_platforms: {
        Row: {
          created_at: string
          host_patterns: string[]
          is_active: boolean
          key: string
          label: string
          sort_order: number
          supports_items: boolean
          supports_profiles: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          host_patterns: string[]
          is_active?: boolean
          key: string
          label: string
          sort_order?: number
          supports_items?: boolean
          supports_profiles?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          host_patterns?: string[]
          is_active?: boolean
          key?: string
          label?: string
          sort_order?: number
          supports_items?: boolean
          supports_profiles?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      interactive_builds: {
        Row: {
          build_version: string
          compression: string
          created_at: string
          created_by: string
          decompression_fallback: boolean
          download_size_mb: number | null
          entry_url: string | null
          id: string
          item_id: string
          manifest_version: number
          max_session_minutes: number
          maximum_heap_memory_mb: number | null
          minimum_device_memory_mb: number | null
          preferred_orientation: string
          requires_cross_origin_isolation: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          runtime: string
          status: string
          supported_browsers: string[]
          supported_inputs: string[]
          supports_desktop: boolean
          supports_mobile: boolean
          unity_version: string | null
          updated_at: string
          wasm_required: boolean
          webgl_version: number
        }
        Insert: {
          build_version: string
          compression?: string
          created_at?: string
          created_by: string
          decompression_fallback?: boolean
          download_size_mb?: number | null
          entry_url?: string | null
          id?: string
          item_id: string
          manifest_version?: number
          max_session_minutes?: number
          maximum_heap_memory_mb?: number | null
          minimum_device_memory_mb?: number | null
          preferred_orientation?: string
          requires_cross_origin_isolation?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          runtime?: string
          status?: string
          supported_browsers?: string[]
          supported_inputs?: string[]
          supports_desktop?: boolean
          supports_mobile?: boolean
          unity_version?: string | null
          updated_at?: string
          wasm_required?: boolean
          webgl_version?: number
        }
        Update: {
          build_version?: string
          compression?: string
          created_at?: string
          created_by?: string
          decompression_fallback?: boolean
          download_size_mb?: number | null
          entry_url?: string | null
          id?: string
          item_id?: string
          manifest_version?: number
          max_session_minutes?: number
          maximum_heap_memory_mb?: number | null
          minimum_device_memory_mb?: number | null
          preferred_orientation?: string
          requires_cross_origin_isolation?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          runtime?: string
          status?: string
          supported_browsers?: string[]
          supported_inputs?: string[]
          supports_desktop?: boolean
          supports_mobile?: boolean
          unity_version?: string | null
          updated_at?: string
          wasm_required?: boolean
          webgl_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "interactive_builds_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      interactive_event_definitions: {
        Row: {
          achievement_id: string | null
          created_at: string
          event_key: string
          event_kind: string
          id: string
          is_enabled: boolean
          item_id: string
          max_per_session: number
          schema_version: number
          updated_at: string
        }
        Insert: {
          achievement_id?: string | null
          created_at?: string
          event_key: string
          event_kind: string
          id?: string
          is_enabled?: boolean
          item_id: string
          max_per_session?: number
          schema_version?: number
          updated_at?: string
        }
        Update: {
          achievement_id?: string | null
          created_at?: string
          event_key?: string
          event_kind?: string
          id?: string
          is_enabled?: boolean
          item_id?: string
          max_per_session?: number
          schema_version?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactive_event_definitions_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "item_achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactive_event_definitions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      interactive_events: {
        Row: {
          definition_id: string
          event_key: string
          event_kind: string
          external_event_id: string | null
          id: string
          item_id: string
          occurred_at: string
          payload: Json
          received_at: string
          replay_nonce: string | null
          sequence_number: number | null
          session_id: string
          signature_sha256: string | null
          signing_key_id: string | null
          trust_level: string
          user_id: string
        }
        Insert: {
          definition_id: string
          event_key: string
          event_kind: string
          external_event_id?: string | null
          id?: string
          item_id: string
          occurred_at: string
          payload?: Json
          received_at?: string
          replay_nonce?: string | null
          sequence_number?: number | null
          session_id: string
          signature_sha256?: string | null
          signing_key_id?: string | null
          trust_level: string
          user_id: string
        }
        Update: {
          definition_id?: string
          event_key?: string
          event_kind?: string
          external_event_id?: string | null
          id?: string
          item_id?: string
          occurred_at?: string
          payload?: Json
          received_at?: string
          replay_nonce?: string | null
          sequence_number?: number | null
          session_id?: string
          signature_sha256?: string | null
          signing_key_id?: string | null
          trust_level?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactive_events_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "interactive_event_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactive_events_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactive_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interactive_launch_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interactive_launch_sessions: {
        Row: {
          build_id: string
          client_context: Json
          ended_at: string | null
          expires_at: string
          id: string
          item_id: string
          last_seen_at: string
          started_at: string
          status: string
          token_hash: string
          user_id: string
        }
        Insert: {
          build_id: string
          client_context?: Json
          ended_at?: string | null
          expires_at: string
          id?: string
          item_id: string
          last_seen_at?: string
          started_at?: string
          status?: string
          token_hash: string
          user_id: string
        }
        Update: {
          build_id?: string
          client_context?: Json
          ended_at?: string | null
          expires_at?: string
          id?: string
          item_id?: string
          last_seen_at?: string
          started_at?: string
          status?: string
          token_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactive_launch_sessions_build_id_fkey"
            columns: ["build_id"]
            isOneToOne: false
            referencedRelation: "interactive_builds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactive_launch_sessions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      interactive_origins: {
        Row: {
          created_at: string
          is_active: boolean
          label: string
          origin: string
        }
        Insert: {
          created_at?: string
          is_active?: boolean
          label: string
          origin: string
        }
        Update: {
          created_at?: string
          is_active?: boolean
          label?: string
          origin?: string
        }
        Relationships: []
      }
      interactive_progress_state: {
        Row: {
          definition_id: string
          item_id: string
          occurred_at: string
          payload: Json
          source_event_id: string
          trust_level: string
          updated_at: string
          user_id: string
        }
        Insert: {
          definition_id: string
          item_id: string
          occurred_at: string
          payload?: Json
          source_event_id: string
          trust_level: string
          updated_at?: string
          user_id: string
        }
        Update: {
          definition_id?: string
          item_id?: string
          occurred_at?: string
          payload?: Json
          source_event_id?: string
          trust_level?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactive_progress_state_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "interactive_event_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactive_progress_state_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactive_progress_state_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "interactive_events"
            referencedColumns: ["id"]
          },
        ]
      }
      item_achievements: {
        Row: {
          code: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_secret: boolean
          item_id: string
          points: number
          reward_config: Json
          reward_item_id: string | null
          sort_order: number
          template_id: string | null
          title: string
          trigger_config: Json
          trigger_type: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_secret?: boolean
          item_id: string
          points?: number
          reward_config?: Json
          reward_item_id?: string | null
          sort_order?: number
          template_id?: string | null
          title: string
          trigger_config?: Json
          trigger_type: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_secret?: boolean
          item_id?: string
          points?: number
          reward_config?: Json
          reward_item_id?: string | null
          sort_order?: number
          template_id?: string | null
          title?: string
          trigger_config?: Json
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_achievements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_achievements_reward_item_id_fkey"
            columns: ["reward_item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_achievements_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "achievement_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      item_assets: {
        Row: {
          asset_type: string
          created_at: string
          file_url: string | null
          id: string
          is_downloadable: boolean
          item_id: string
          sort_order: number
          storage_path: string | null
          title: string
        }
        Insert: {
          asset_type: string
          created_at?: string
          file_url?: string | null
          id?: string
          is_downloadable?: boolean
          item_id: string
          sort_order?: number
          storage_path?: string | null
          title: string
        }
        Update: {
          asset_type?: string
          created_at?: string
          file_url?: string | null
          id?: string
          is_downloadable?: boolean
          item_id?: string
          sort_order?: number
          storage_path?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_assets_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_capabilities: {
        Row: {
          capability_key: string
          config_version: number
          created_at: string
          is_enabled: boolean
          item_id: string
          updated_at: string
        }
        Insert: {
          capability_key: string
          config_version?: number
          created_at?: string
          is_enabled?: boolean
          item_id: string
          updated_at?: string
        }
        Update: {
          capability_key?: string
          config_version?: number
          created_at?: string
          is_enabled?: boolean
          item_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_capabilities_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      item_child_archives: {
        Row: {
          archived_at: string
          archived_by: string
          child_id: string
          child_type: string
          item_id: string
          reason: string
        }
        Insert: {
          archived_at?: string
          archived_by: string
          child_id: string
          child_type: string
          item_id: string
          reason: string
        }
        Update: {
          archived_at?: string
          archived_by?: string
          child_id?: string
          child_type?: string
          item_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_child_archives_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_child_archives_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_external_links: {
        Row: {
          created_at: string
          id: string
          item_id: string
          label: string
          platform: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          label: string
          platform: string
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          label?: string
          platform?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_external_links_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_members: {
        Row: {
          created_at: string
          item_id: string
          member_role: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          item_id: string
          member_role?: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          item_id?: string
          member_role?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_members_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      item_play_events: {
        Row: {
          id: string
          item_id: string
          metadata: Json
          occurred_at: string
          play_reason: string
          playback_mode: string
          session_id: string
          track_id: string
          user_id: string | null
        }
        Insert: {
          id?: string
          item_id: string
          metadata?: Json
          occurred_at?: string
          play_reason?: string
          playback_mode?: string
          session_id: string
          track_id: string
          user_id?: string | null
        }
        Update: {
          id?: string
          item_id?: string
          metadata?: Json
          occurred_at?: string
          play_reason?: string
          playback_mode?: string
          session_id?: string
          track_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_play_events_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_play_events_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      item_rights_attestations: {
        Row: {
          attested_at: string
          attested_by: string
          id: string
          item_id: string
          metadata: Json
          policy_version: string
          revoked_at: string | null
          statement: string
        }
        Insert: {
          attested_at?: string
          attested_by: string
          id?: string
          item_id: string
          metadata?: Json
          policy_version: string
          revoked_at?: string | null
          statement: string
        }
        Update: {
          attested_at?: string
          attested_by?: string
          id?: string
          item_id?: string
          metadata?: Json
          policy_version?: string
          revoked_at?: string | null
          statement?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_rights_attestations_attested_by_fkey"
            columns: ["attested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_rights_attestations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_share_visits: {
        Row: {
          created_at: string
          id: string
          item_id: string
          referrer_id: string
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          referrer_id: string
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          referrer_id?: string
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_share_visits_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_share_visits_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_share_visits_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      item_submission_achievements: {
        Row: {
          code: string
          description: string | null
          icon: string | null
          is_secret: boolean
          points: number
          reward_config: Json
          reward_item_id: string | null
          sort_order: number
          source_id: string
          submission_id: string
          template_id: string | null
          title: string
          trigger_config: Json
          trigger_type: string
        }
        Insert: {
          code: string
          description?: string | null
          icon?: string | null
          is_secret: boolean
          points: number
          reward_config?: Json
          reward_item_id?: string | null
          sort_order: number
          source_id?: string
          submission_id: string
          template_id?: string | null
          title: string
          trigger_config?: Json
          trigger_type: string
        }
        Update: {
          code?: string
          description?: string | null
          icon?: string | null
          is_secret?: boolean
          points?: number
          reward_config?: Json
          reward_item_id?: string | null
          sort_order?: number
          source_id?: string
          submission_id?: string
          template_id?: string | null
          title?: string
          trigger_config?: Json
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_submission_achievements_reward_item_id_fkey"
            columns: ["reward_item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_submission_achievements_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "item_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_submission_achievements_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "achievement_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      item_submission_assets: {
        Row: {
          asset_type: string
          file_url: string | null
          is_downloadable: boolean
          sort_order: number
          source_id: string
          storage_path: string | null
          submission_id: string
          title: string
        }
        Insert: {
          asset_type: string
          file_url?: string | null
          is_downloadable: boolean
          sort_order: number
          source_id?: string
          storage_path?: string | null
          submission_id: string
          title: string
        }
        Update: {
          asset_type?: string
          file_url?: string | null
          is_downloadable?: boolean
          sort_order?: number
          source_id?: string
          storage_path?: string | null
          submission_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_submission_assets_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "item_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      item_submission_beat_attributes: {
        Row: {
          submission_id: string
          term_id: string
        }
        Insert: {
          submission_id: string
          term_id: string
        }
        Update: {
          submission_id?: string
          term_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_submission_beat_attributes_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "item_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_submission_beat_attributes_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "beat_attribute_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      item_submission_beat_details: {
        Row: {
          bpm: number
          item_id: string
          key_mode: string | null
          key_not_applicable: boolean
          key_root: string | null
          preview_track_source_id: string
          sale_status: string
          sample_disclosure: string | null
          sample_status: string
          sold_at: string | null
          submission_id: string
          time_signature: string
        }
        Insert: {
          bpm: number
          item_id: string
          key_mode?: string | null
          key_not_applicable: boolean
          key_root?: string | null
          preview_track_source_id: string
          sale_status: string
          sample_disclosure?: string | null
          sample_status: string
          sold_at?: string | null
          submission_id: string
          time_signature: string
        }
        Update: {
          bpm?: number
          item_id?: string
          key_mode?: string | null
          key_not_applicable?: boolean
          key_root?: string | null
          preview_track_source_id?: string
          sale_status?: string
          sample_disclosure?: string | null
          sample_status?: string
          sold_at?: string | null
          submission_id?: string
          time_signature?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_submission_beat_details_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_submission_beat_details_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: true
            referencedRelation: "item_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      item_submission_beat_files: {
        Row: {
          asset_source_id: string
          file_kind: string
          source_id: string
          submission_id: string
        }
        Insert: {
          asset_source_id: string
          file_kind: string
          source_id: string
          submission_id: string
        }
        Update: {
          asset_source_id?: string
          file_kind?: string
          source_id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_submission_beat_files_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "item_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      item_submission_beat_license_offers: {
        Row: {
          offer_source_id: string
          submission_id: string
          template_id: string
        }
        Insert: {
          offer_source_id: string
          submission_id: string
          template_id: string
        }
        Update: {
          offer_source_id?: string
          submission_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_submission_beat_license_offers_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "item_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_submission_beat_license_offers_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "beat_license_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      item_submission_beat_offer_files: {
        Row: {
          beat_file_source_id: string
          offer_source_id: string
          submission_id: string
        }
        Insert: {
          beat_file_source_id: string
          offer_source_id: string
          submission_id: string
        }
        Update: {
          beat_file_source_id?: string
          offer_source_id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_submission_beat_offer_files_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "item_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      item_submission_beat_splits: {
        Row: {
          acceptance_status: string
          accepted_at: string | null
          profile_id: string
          publishing_share_bps: number
          revenue_share_bps: number
          submission_id: string
        }
        Insert: {
          acceptance_status: string
          accepted_at?: string | null
          profile_id: string
          publishing_share_bps: number
          revenue_share_bps: number
          submission_id: string
        }
        Update: {
          acceptance_status?: string
          accepted_at?: string | null
          profile_id?: string
          publishing_share_bps?: number
          revenue_share_bps?: number
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_submission_beat_splits_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_submission_beat_splits_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "item_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      item_submission_capabilities: {
        Row: {
          capability_key: string
          config_version: number
          is_enabled: boolean
          submission_id: string
        }
        Insert: {
          capability_key: string
          config_version: number
          is_enabled: boolean
          submission_id: string
        }
        Update: {
          capability_key?: string
          config_version?: number
          is_enabled?: boolean
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_submission_capabilities_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "item_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      item_submission_child_tombstones: {
        Row: {
          child_type: string
          created_at: string
          reason: string
          source_id: string
          submission_id: string
        }
        Insert: {
          child_type: string
          created_at?: string
          reason: string
          source_id: string
          submission_id: string
        }
        Update: {
          child_type?: string
          created_at?: string
          reason?: string
          source_id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_submission_child_tombstones_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "item_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      item_submission_decisions: {
        Row: {
          decided_at: string
          decision: string
          id: string
          policy_version: string
          reason: string
          reviewer_id: string
          submission_id: string
        }
        Insert: {
          decided_at?: string
          decision: string
          id?: string
          policy_version: string
          reason: string
          reviewer_id: string
          submission_id: string
        }
        Update: {
          decided_at?: string
          decision?: string
          id?: string
          policy_version?: string
          reason?: string
          reviewer_id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_submission_decisions_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_submission_decisions_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "item_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      item_submission_external_links: {
        Row: {
          label: string
          platform: string
          sort_order: number
          source_id: string
          submission_id: string
          url: string
        }
        Insert: {
          label: string
          platform: string
          sort_order: number
          source_id?: string
          submission_id: string
          url: string
        }
        Update: {
          label?: string
          platform?: string
          sort_order?: number
          source_id?: string
          submission_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_submission_external_links_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "item_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      item_submission_items: {
        Row: {
          author_id: string
          available_locally_only: boolean
          cover_url: string | null
          creator: string
          download_purchase_enabled: boolean
          download_url: string | null
          experience_type: string
          feature_description: string | null
          featured: boolean
          fulfillment_type: string
          hero_url: string | null
          is_free: boolean
          item_category_id: string | null
          item_id: string
          item_type: string
          launch_url: string | null
          local_currency: string | null
          local_price_cents: number | null
          long_description: string | null
          market_mode: string
          merch_fulfillment_mode: string | null
          merch_shipping_scope: string | null
          price_cents: number
          read_url: string | null
          short_description: string | null
          slug: string
          sort_order: number | null
          streaming_enabled: boolean
          submission_id: string
          tags: string[]
          title: string
          year: number | null
        }
        Insert: {
          author_id: string
          available_locally_only: boolean
          cover_url?: string | null
          creator: string
          download_purchase_enabled: boolean
          download_url?: string | null
          experience_type: string
          feature_description?: string | null
          featured: boolean
          fulfillment_type: string
          hero_url?: string | null
          is_free: boolean
          item_category_id?: string | null
          item_id: string
          item_type: string
          launch_url?: string | null
          local_currency?: string | null
          local_price_cents?: number | null
          long_description?: string | null
          market_mode: string
          merch_fulfillment_mode?: string | null
          merch_shipping_scope?: string | null
          price_cents: number
          read_url?: string | null
          short_description?: string | null
          slug: string
          sort_order?: number | null
          streaming_enabled: boolean
          submission_id: string
          tags?: string[]
          title: string
          year?: number | null
        }
        Update: {
          author_id?: string
          available_locally_only?: boolean
          cover_url?: string | null
          creator?: string
          download_purchase_enabled?: boolean
          download_url?: string | null
          experience_type?: string
          feature_description?: string | null
          featured?: boolean
          fulfillment_type?: string
          hero_url?: string | null
          is_free?: boolean
          item_category_id?: string | null
          item_id?: string
          item_type?: string
          launch_url?: string | null
          local_currency?: string | null
          local_price_cents?: number | null
          long_description?: string | null
          market_mode?: string
          merch_fulfillment_mode?: string | null
          merch_shipping_scope?: string | null
          price_cents?: number
          read_url?: string | null
          short_description?: string | null
          slug?: string
          sort_order?: number | null
          streaming_enabled?: boolean
          submission_id?: string
          tags?: string[]
          title?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "item_submission_items_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_submission_items_item_category_id_fkey"
            columns: ["item_category_id"]
            isOneToOne: false
            referencedRelation: "item_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_submission_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_submission_items_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: true
            referencedRelation: "item_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      item_submission_members: {
        Row: {
          member_role: string
          profile_id: string
          submission_id: string
        }
        Insert: {
          member_role: string
          profile_id: string
          submission_id: string
        }
        Update: {
          member_role?: string
          profile_id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_submission_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_submission_members_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "item_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      item_submission_notification_events: {
        Row: {
          created_at: string
          delivered_at: string | null
          delivery_attempts: number
          delivery_claimed_at: string | null
          delivery_last_error: string | null
          event_type: string
          id: string
          payload: Json
          recipient_id: string | null
          submission_id: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          delivery_attempts?: number
          delivery_claimed_at?: string | null
          delivery_last_error?: string | null
          event_type: string
          id?: string
          payload?: Json
          recipient_id?: string | null
          submission_id: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          delivery_attempts?: number
          delivery_claimed_at?: string | null
          delivery_last_error?: string | null
          event_type?: string
          id?: string
          payload?: Json
          recipient_id?: string | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_submission_notification_events_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_submission_notification_events_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "item_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      item_submission_offer_entitlements: {
        Row: {
          entitlement_type: string
          offer_source_id: string
          submission_id: string
        }
        Insert: {
          entitlement_type: string
          offer_source_id: string
          submission_id: string
        }
        Update: {
          entitlement_type?: string
          offer_source_id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_submission_offer_entitle_submission_id_offer_source_i_fkey"
            columns: ["submission_id", "offer_source_id"]
            isOneToOne: false
            referencedRelation: "item_submission_offers"
            referencedColumns: ["submission_id", "source_id"]
          },
          {
            foreignKeyName: "item_submission_offer_entitlements_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "item_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      item_submission_offers: {
        Row: {
          code: string
          currency: string
          description: string | null
          ends_at: string | null
          fulfillment_type: string
          offer_type: string
          price_cents: number
          quantity_limit: number | null
          source_id: string
          starts_at: string | null
          status: string
          submission_id: string
          title: string
        }
        Insert: {
          code: string
          currency: string
          description?: string | null
          ends_at?: string | null
          fulfillment_type: string
          offer_type: string
          price_cents: number
          quantity_limit?: number | null
          source_id?: string
          starts_at?: string | null
          status: string
          submission_id: string
          title: string
        }
        Update: {
          code?: string
          currency?: string
          description?: string | null
          ends_at?: string | null
          fulfillment_type?: string
          offer_type?: string
          price_cents?: number
          quantity_limit?: number | null
          source_id?: string
          starts_at?: string | null
          status?: string
          submission_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_submission_offers_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "item_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      item_submission_tag_assignments: {
        Row: {
          item_tag_id: string
          submission_id: string
        }
        Insert: {
          item_tag_id: string
          submission_id: string
        }
        Update: {
          item_tag_id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_submission_tag_assignments_item_tag_id_fkey"
            columns: ["item_tag_id"]
            isOneToOne: false
            referencedRelation: "item_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_submission_tag_assignments_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "item_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      item_submission_tracks: {
        Row: {
          audio_url: string | null
          download_url: string | null
          duration_seconds: number | null
          number: number
          source_id: string
          submission_id: string
          title: string
        }
        Insert: {
          audio_url?: string | null
          download_url?: string | null
          duration_seconds?: number | null
          number: number
          source_id?: string
          submission_id: string
          title: string
        }
        Update: {
          audio_url?: string | null
          download_url?: string | null
          duration_seconds?: number | null
          number?: number
          source_id?: string
          submission_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_submission_tracks_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "item_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      item_submission_type_assignments: {
        Row: {
          item_type_id: string
          submission_id: string
        }
        Insert: {
          item_type_id: string
          submission_id: string
        }
        Update: {
          item_type_id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_submission_type_assignments_item_type_id_fkey"
            columns: ["item_type_id"]
            isOneToOne: false
            referencedRelation: "item_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_submission_type_assignments_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: true
            referencedRelation: "item_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      item_submission_video_embeds: {
        Row: {
          sort_order: number
          source_id: string
          submission_id: string
          title: string
          youtube_video_id: string
        }
        Insert: {
          sort_order: number
          source_id?: string
          submission_id: string
          title: string
          youtube_video_id: string
        }
        Update: {
          sort_order?: number
          source_id?: string
          submission_id?: string
          title?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_submission_video_embeds_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "item_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      item_submissions: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_reason: string | null
          id: string
          idempotency_key: string
          item_id: string
          policy_version: string
          status: string
          submission_kind: string
          submitted_at: string
          submitter_id: string
          withdrawal_reason: string | null
          withdrawn_at: string | null
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          id?: string
          idempotency_key: string
          item_id: string
          policy_version: string
          status?: string
          submission_kind: string
          submitted_at?: string
          submitter_id: string
          withdrawal_reason?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          id?: string
          idempotency_key?: string
          item_id?: string
          policy_version?: string
          status?: string
          submission_kind?: string
          submitted_at?: string
          submitter_id?: string
          withdrawal_reason?: string | null
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_submissions_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_submissions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_submissions_submitter_id_fkey"
            columns: ["submitter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      item_tag_assignments: {
        Row: {
          created_at: string
          item_id: string
          item_tag_id: string
        }
        Insert: {
          created_at?: string
          item_id: string
          item_tag_id: string
        }
        Update: {
          created_at?: string
          item_id?: string
          item_tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_tag_assignments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_tag_assignments_item_tag_id_fkey"
            columns: ["item_tag_id"]
            isOneToOne: false
            referencedRelation: "item_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      item_tags: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_active: boolean
          item_type_id: string | null
          label: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          item_type_id?: string | null
          label: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          item_type_id?: string | null
          label?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_tags_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "item_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_tags_item_type_id_fkey"
            columns: ["item_type_id"]
            isOneToOne: false
            referencedRelation: "item_types"
            referencedColumns: ["id"]
          },
        ]
      }
      item_type_assignments: {
        Row: {
          created_at: string
          item_id: string
          item_type_id: string
        }
        Insert: {
          created_at?: string
          item_id: string
          item_type_id: string
        }
        Update: {
          created_at?: string
          item_id?: string
          item_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_type_assignments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_type_assignments_item_type_id_fkey"
            columns: ["item_type_id"]
            isOneToOne: false
            referencedRelation: "item_types"
            referencedColumns: ["id"]
          },
        ]
      }
      item_types: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_types_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "item_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      item_video_embeds: {
        Row: {
          created_at: string
          id: string
          item_id: string
          sort_order: number
          title: string
          updated_at: string
          youtube_video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          sort_order?: number
          title: string
          updated_at?: string
          youtube_video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_video_embeds_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      library_entries: {
        Row: {
          acquired_at: string
          acquisition_type: string
          id: string
          item_id: string
          status: string
          user_id: string
        }
        Insert: {
          acquired_at?: string
          acquisition_type?: string
          id?: string
          item_id: string
          status?: string
          user_id: string
        }
        Update: {
          acquired_at?: string
          acquisition_type?: string
          id?: string
          item_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_entries_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      merch_order_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          line_total_cents: number
          order_id: string
          quantity: number
          unit_price_cents: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          line_total_cents?: number
          order_id: string
          quantity?: number
          unit_price_cents?: number
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          line_total_cents?: number
          order_id?: string
          quantity?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "merch_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "merch_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merch_order_items_product_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      merch_orders: {
        Row: {
          buyer_email: string
          buyer_id: string
          buyer_name: string
          completed_at: string | null
          created_at: string
          creator_id: string
          currency: string
          delivery_address_1: string
          delivery_address_2: string | null
          delivery_city: string
          delivery_country: string
          delivery_name: string
          delivery_notes: string | null
          delivery_postal_code: string
          delivery_region: string
          id: string
          paid_at: string
          received_at: string | null
          status: string
          subtotal_cents: number
          updated_at: string
        }
        Insert: {
          buyer_email: string
          buyer_id: string
          buyer_name: string
          completed_at?: string | null
          created_at?: string
          creator_id: string
          currency?: string
          delivery_address_1: string
          delivery_address_2?: string | null
          delivery_city: string
          delivery_country: string
          delivery_name: string
          delivery_notes?: string | null
          delivery_postal_code: string
          delivery_region: string
          id?: string
          paid_at?: string
          received_at?: string | null
          status?: string
          subtotal_cents?: number
          updated_at?: string
        }
        Update: {
          buyer_email?: string
          buyer_id?: string
          buyer_name?: string
          completed_at?: string | null
          created_at?: string
          creator_id?: string
          currency?: string
          delivery_address_1?: string
          delivery_address_2?: string | null
          delivery_city?: string
          delivery_country?: string
          delivery_name?: string
          delivery_notes?: string | null
          delivery_postal_code?: string
          delivery_region?: string
          id?: string
          paid_at?: string
          received_at?: string | null
          status?: string
          subtotal_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merch_orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merch_orders_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      merch_product_images: {
        Row: {
          byte_size: number | null
          color_value: string | null
          content_sha256: string | null
          content_type: string | null
          created_at: string
          created_by: string
          file_url: string
          id: string
          is_featured: boolean
          item_id: string
          original_filename: string | null
          role: string
          sort_order: number
          storage_path: string
          title: string
          updated_at: string
        }
        Insert: {
          byte_size?: number | null
          color_value?: string | null
          content_sha256?: string | null
          content_type?: string | null
          created_at?: string
          created_by: string
          file_url: string
          id?: string
          is_featured?: boolean
          item_id: string
          original_filename?: string | null
          role: string
          sort_order?: number
          storage_path: string
          title: string
          updated_at?: string
        }
        Update: {
          byte_size?: number | null
          color_value?: string | null
          content_sha256?: string | null
          content_type?: string | null
          created_at?: string
          created_by?: string
          file_url?: string
          id?: string
          is_featured?: boolean
          item_id?: string
          original_filename?: string | null
          role?: string
          sort_order?: number
          storage_path?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merch_product_images_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merch_product_images_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      merch_storage_cleanup_queue: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          id: string
          last_error: string | null
          not_before: string
          reason: string
          storage_path: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          not_before?: string
          reason: string
          storage_path: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          not_before?: string
          reason?: string
          storage_path?: string
        }
        Relationships: []
      }
      merch_storage_reconciliation_runs: {
        Row: {
          completed_at: string | null
          failed_count: number
          id: string
          notes: string | null
          queued_count: number
          removed_count: number
          retained_count: number
          scanned_count: number
          started_at: string
        }
        Insert: {
          completed_at?: string | null
          failed_count?: number
          id?: string
          notes?: string | null
          queued_count?: number
          removed_count?: number
          retained_count?: number
          scanned_count?: number
          started_at?: string
        }
        Update: {
          completed_at?: string | null
          failed_count?: number
          id?: string
          notes?: string | null
          queued_count?: number
          removed_count?: number
          retained_count?: number
          scanned_count?: number
          started_at?: string
        }
        Relationships: []
      }
      merch_variants: {
        Row: {
          code: string
          created_at: string
          display_name: string
          id: string
          image_url: string | null
          is_default: boolean
          item_id: string
          option_values: Json
          price_cents: number | null
          sku: string | null
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          display_name: string
          id?: string
          image_url?: string | null
          is_default?: boolean
          item_id: string
          option_values?: Json
          price_cents?: number | null
          sku?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          display_name?: string
          id?: string
          image_url?: string | null
          is_default?: boolean
          item_id?: string
          option_values?: Json
          price_cents?: number | null
          sku?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merch_variants_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string | null
          status: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id?: string | null
          status?: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_consent_events: {
        Row: {
          action: string
          id: string
          occurred_at: string
          policy_version: string
          source: string
          user_id: string
        }
        Insert: {
          action: string
          id?: string
          occurred_at?: string
          policy_version: string
          source: string
          user_id: string
        }
        Update: {
          action?: string
          id?: string
          occurred_at?: string
          policy_version?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      newsletter_consents: {
        Row: {
          consent_source: string
          consented_at: string | null
          email_normalized: string
          last_sync_error: string | null
          policy_version: string
          provider_contact_id: string | null
          provider_topic_id: string | null
          revoked_at: string | null
          status: string
          sync_attempts: number
          sync_claimed_at: string | null
          sync_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          consent_source: string
          consented_at?: string | null
          email_normalized: string
          last_sync_error?: string | null
          policy_version: string
          provider_contact_id?: string | null
          provider_topic_id?: string | null
          revoked_at?: string | null
          status: string
          sync_attempts?: number
          sync_claimed_at?: string | null
          sync_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          consent_source?: string
          consented_at?: string | null
          email_normalized?: string
          last_sync_error?: string | null
          policy_version?: string
          provider_contact_id?: string | null
          provider_topic_id?: string | null
          revoked_at?: string | null
          status?: string
          sync_attempts?: number
          sync_claimed_at?: string | null
          sync_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      newsletter_contact_retirements: {
        Row: {
          claim_token: string | null
          claimed_at: string | null
          created_at: string
          email_normalized: string
          id: string
          last_sync_error: string | null
          provider_contact_id: string | null
          provider_topic_id: string | null
          sync_attempts: number
          sync_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          claim_token?: string | null
          claimed_at?: string | null
          created_at?: string
          email_normalized: string
          id?: string
          last_sync_error?: string | null
          provider_contact_id?: string | null
          provider_topic_id?: string | null
          sync_attempts?: number
          sync_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          claim_token?: string | null
          claimed_at?: string | null
          created_at?: string
          email_normalized?: string
          id?: string
          last_sync_error?: string | null
          provider_contact_id?: string | null
          provider_topic_id?: string | null
          sync_attempts?: number
          sync_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_delivery_controls: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          enabled: boolean
          singleton: boolean
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          enabled?: boolean
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          enabled?: boolean
          singleton?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_controls_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_entitlements: {
        Row: {
          created_at: string
          entitlement_type: string
          offer_id: string
        }
        Insert: {
          created_at?: string
          entitlement_type: string
          offer_id: string
        }
        Update: {
          created_at?: string
          entitlement_type?: string
          offer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_entitlements_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "catalog_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_error_events: {
        Row: {
          created_at: string
          error_code: string | null
          error_digest: string | null
          error_name: string
          framework_context: Json
          id: string
          method: string
          occurred_at: string
          path: string
          release: string
          runtime: string
          safe_message: string | null
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          error_digest?: string | null
          error_name: string
          framework_context?: Json
          id?: string
          method: string
          occurred_at?: string
          path: string
          release: string
          runtime: string
          safe_message?: string | null
        }
        Update: {
          created_at?: string
          error_code?: string | null
          error_digest?: string | null
          error_name?: string
          framework_context?: Json
          id?: string
          method?: string
          occurred_at?: string
          path?: string
          release?: string
          runtime?: string
          safe_message?: string | null
        }
        Relationships: []
      }
      payment_attempts: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          disputed_cents: number
          failure_code: string | null
          failure_message: string | null
          id: string
          idempotency_key: string
          order_id: string
          provider: string
          provider_charge_id: string | null
          provider_payment_id: string | null
          provider_session_id: string | null
          refunded_cents: number
          status: string
          succeeded_at: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency: string
          disputed_cents?: number
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          idempotency_key: string
          order_id: string
          provider: string
          provider_charge_id?: string | null
          provider_payment_id?: string | null
          provider_session_id?: string | null
          refunded_cents?: number
          status?: string
          succeeded_at?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          disputed_cents?: number
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          idempotency_key?: string
          order_id?: string
          provider?: string
          provider_charge_id?: string | null
          provider_payment_id?: string | null
          provider_session_id?: string | null
          refunded_cents?: number
          status?: string
          succeeded_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_attempts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "commerce_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          error_message: string | null
          event_type: string
          id: string
          order_id: string | null
          payload: Json
          payment_attempt_id: string | null
          processed_at: string | null
          processing_status: string
          provider: string
          provider_event_id: string
          received_at: string
        }
        Insert: {
          error_message?: string | null
          event_type: string
          id?: string
          order_id?: string | null
          payload: Json
          payment_attempt_id?: string | null
          processed_at?: string | null
          processing_status?: string
          provider: string
          provider_event_id: string
          received_at?: string
        }
        Update: {
          error_message?: string | null
          event_type?: string
          id?: string
          order_id?: string | null
          payload?: Json
          payment_attempt_id?: string | null
          processed_at?: string | null
          processing_status?: string
          provider?: string
          provider_event_id?: string
          received_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "commerce_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_payment_attempt_id_fkey"
            columns: ["payment_attempt_id"]
            isOneToOne: false
            referencedRelation: "payment_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_replies: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          parent_reply_id: string | null
          post_id: string
          status: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          parent_reply_id?: string | null
          post_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          parent_reply_id?: string | null
          post_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_replies_parent_reply_id_fkey"
            columns: ["parent_reply_id"]
            isOneToOne: false
            referencedRelation: "post_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string | null
          body: string | null
          created_at: string
          id: string
          slug: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          slug?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          slug?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      printful_catalog_sync_runs: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          provider_product_count: number | null
          started_at: string
          started_by: string
          status: string
          store_id: number
          summary: Json
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          provider_product_count?: number | null
          started_at?: string
          started_by: string
          status?: string
          store_id: number
          summary?: Json
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          provider_product_count?: number | null
          started_at?: string
          started_by?: string
          status?: string
          store_id?: number
          summary?: Json
        }
        Relationships: [
          {
            foreignKeyName: "printful_catalog_sync_runs_started_by_fkey"
            columns: ["started_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      printful_fulfillment_order_items: {
        Row: {
          commerce_order_item_id: string
          created_at: string
          fulfillment_order_id: string
          provider_cost_cents: number | null
          provider_order_item_id: number | null
          quantity: number
          variant_mapping_id: string
        }
        Insert: {
          commerce_order_item_id: string
          created_at?: string
          fulfillment_order_id: string
          provider_cost_cents?: number | null
          provider_order_item_id?: number | null
          quantity: number
          variant_mapping_id: string
        }
        Update: {
          commerce_order_item_id?: string
          created_at?: string
          fulfillment_order_id?: string
          provider_cost_cents?: number | null
          provider_order_item_id?: number | null
          quantity?: number
          variant_mapping_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "printful_fulfillment_order_items_commerce_order_item_id_fkey"
            columns: ["commerce_order_item_id"]
            isOneToOne: true
            referencedRelation: "commerce_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printful_fulfillment_order_items_fulfillment_order_id_fkey"
            columns: ["fulfillment_order_id"]
            isOneToOne: false
            referencedRelation: "printful_fulfillment_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printful_fulfillment_order_items_variant_mapping_id_fkey"
            columns: ["variant_mapping_id"]
            isOneToOne: false
            referencedRelation: "printful_variant_mappings"
            referencedColumns: ["id"]
          },
        ]
      }
      printful_fulfillment_orders: {
        Row: {
          charged_cents: number
          commerce_order_id: string
          confirmation_requested_at: string | null
          confirmed_externally_at: string | null
          created_at: string
          external_id: string
          failure_code: string | null
          failure_message: string | null
          id: string
          last_provider_event_at: string | null
          provider_currency: string | null
          provider_dashboard_url: string | null
          provider_order_id: number | null
          provider_shipping_cents: number | null
          provider_status: string
          provider_subtotal_cents: number | null
          provider_tax_cents: number | null
          provider_total_cents: number | null
          request_snapshot: Json
          response_snapshot: Json
          shipping_quote_id: string | null
          store_id: number
          updated_at: string
        }
        Insert: {
          charged_cents?: number
          commerce_order_id: string
          confirmation_requested_at?: string | null
          confirmed_externally_at?: string | null
          created_at?: string
          external_id: string
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          last_provider_event_at?: string | null
          provider_currency?: string | null
          provider_dashboard_url?: string | null
          provider_order_id?: number | null
          provider_shipping_cents?: number | null
          provider_status?: string
          provider_subtotal_cents?: number | null
          provider_tax_cents?: number | null
          provider_total_cents?: number | null
          request_snapshot: Json
          response_snapshot?: Json
          shipping_quote_id?: string | null
          store_id: number
          updated_at?: string
        }
        Update: {
          charged_cents?: number
          commerce_order_id?: string
          confirmation_requested_at?: string | null
          confirmed_externally_at?: string | null
          created_at?: string
          external_id?: string
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          last_provider_event_at?: string | null
          provider_currency?: string | null
          provider_dashboard_url?: string | null
          provider_order_id?: number | null
          provider_shipping_cents?: number | null
          provider_status?: string
          provider_subtotal_cents?: number | null
          provider_tax_cents?: number | null
          provider_total_cents?: number | null
          request_snapshot?: Json
          response_snapshot?: Json
          shipping_quote_id?: string | null
          store_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "printful_fulfillment_orders_commerce_order_id_fkey"
            columns: ["commerce_order_id"]
            isOneToOne: true
            referencedRelation: "commerce_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printful_fulfillment_orders_shipping_quote_id_fkey"
            columns: ["shipping_quote_id"]
            isOneToOne: false
            referencedRelation: "printful_shipping_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      printful_fulfillment_shipments: {
        Row: {
          created_at: string
          delivered_at: string | null
          fulfillment_order_id: string
          id: string
          last_provider_event_at: string
          provider_shipment_id: number
          provider_snapshot: Json
          returned_at: string | null
          shipped_at: string | null
          status: string
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          fulfillment_order_id: string
          id?: string
          last_provider_event_at: string
          provider_shipment_id: number
          provider_snapshot?: Json
          returned_at?: string | null
          shipped_at?: string | null
          status: string
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          fulfillment_order_id?: string
          id?: string
          last_provider_event_at?: string
          provider_shipment_id?: number
          provider_snapshot?: Json
          returned_at?: string | null
          shipped_at?: string | null
          status?: string
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "printful_fulfillment_shipments_fulfillment_order_id_fkey"
            columns: ["fulfillment_order_id"]
            isOneToOne: false
            referencedRelation: "printful_fulfillment_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      printful_pricing_approvals: {
        Row: {
          approved_at: string
          approved_by: string
          blocked_variant_count: number
          eligible_variant_count: number
          id: string
          item_id: string
          maximum_provider_cost_cents: number
          minimum_margin_cents: number
          retail_price_cents: number
        }
        Insert: {
          approved_at?: string
          approved_by: string
          blocked_variant_count: number
          eligible_variant_count: number
          id?: string
          item_id: string
          maximum_provider_cost_cents: number
          minimum_margin_cents: number
          retail_price_cents: number
        }
        Update: {
          approved_at?: string
          approved_by?: string
          blocked_variant_count?: number
          eligible_variant_count?: number
          id?: string
          item_id?: string
          maximum_provider_cost_cents?: number
          minimum_margin_cents?: number
          retail_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "printful_pricing_approvals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printful_pricing_approvals_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      printful_product_mappings: {
        Row: {
          created_at: string
          external_id: string | null
          id: string
          item_id: string
          last_catalog_sync_id: string | null
          last_synced_at: string
          provider_name: string
          provider_snapshot: Json
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          store_id: number
          sync_product_id: number
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_id?: string | null
          id?: string
          item_id: string
          last_catalog_sync_id?: string | null
          last_synced_at?: string
          provider_name: string
          provider_snapshot?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          store_id: number
          sync_product_id: number
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_id?: string | null
          id?: string
          item_id?: string
          last_catalog_sync_id?: string | null
          last_synced_at?: string
          provider_name?: string
          provider_snapshot?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          store_id?: number
          sync_product_id?: number
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "printful_product_mappings_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printful_product_mappings_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printful_product_mappings_sync_run_fkey"
            columns: ["last_catalog_sync_id"]
            isOneToOne: false
            referencedRelation: "printful_catalog_sync_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      printful_runtime_controls: {
        Row: {
          approved_by: string | null
          catalog_import_enabled: boolean
          confirmation_enabled: boolean
          created_at: string
          draft_orders_enabled: boolean
          minimum_margin_cents: number
          provider_connected: boolean
          quote_ttl_minutes: number
          shipping_quotes_enabled: boolean
          singleton: boolean
          store_id: number | null
          updated_at: string
          verified_at: string | null
          webhook_configured: boolean
        }
        Insert: {
          approved_by?: string | null
          catalog_import_enabled?: boolean
          confirmation_enabled?: boolean
          created_at?: string
          draft_orders_enabled?: boolean
          minimum_margin_cents?: number
          provider_connected?: boolean
          quote_ttl_minutes?: number
          shipping_quotes_enabled?: boolean
          singleton?: boolean
          store_id?: number | null
          updated_at?: string
          verified_at?: string | null
          webhook_configured?: boolean
        }
        Update: {
          approved_by?: string | null
          catalog_import_enabled?: boolean
          confirmation_enabled?: boolean
          created_at?: string
          draft_orders_enabled?: boolean
          minimum_margin_cents?: number
          provider_connected?: boolean
          quote_ttl_minutes?: number
          shipping_quotes_enabled?: boolean
          singleton?: boolean
          store_id?: number | null
          updated_at?: string
          verified_at?: string | null
          webhook_configured?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "printful_runtime_controls_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      printful_shipping_quotes: {
        Row: {
          country_code: string
          currency: string
          expires_at: string
          id: string
          items_snapshot: Json
          quote_key: string
          quoted_at: string
          rates_snapshot: Json
          recipient_fingerprint: string
          selected_rate_cents: number | null
          selected_rate_id: string | null
          state_code: string | null
          store_id: number
        }
        Insert: {
          country_code: string
          currency: string
          expires_at: string
          id?: string
          items_snapshot: Json
          quote_key: string
          quoted_at?: string
          rates_snapshot: Json
          recipient_fingerprint: string
          selected_rate_cents?: number | null
          selected_rate_id?: string | null
          state_code?: string | null
          store_id: number
        }
        Update: {
          country_code?: string
          currency?: string
          expires_at?: string
          id?: string
          items_snapshot?: Json
          quote_key?: string
          quoted_at?: string
          rates_snapshot?: Json
          recipient_fingerprint?: string
          selected_rate_cents?: number | null
          selected_rate_id?: string | null
          state_code?: string | null
          store_id?: number
        }
        Relationships: []
      }
      printful_variant_mappings: {
        Row: {
          availability_status: string
          catalog_variant_id: number
          color_value: string | null
          created_at: string
          id: string
          last_catalog_sync_id: string | null
          last_synced_at: string
          merch_variant_id: string
          product_mapping_id: string
          provider_cost_cents: number | null
          provider_currency: string | null
          provider_name: string
          provider_snapshot: Json
          reviewed_at: string | null
          reviewed_by: string | null
          size_value: string | null
          sku: string | null
          status: string
          sync_variant_id: number
          updated_at: string
        }
        Insert: {
          availability_status: string
          catalog_variant_id: number
          color_value?: string | null
          created_at?: string
          id?: string
          last_catalog_sync_id?: string | null
          last_synced_at?: string
          merch_variant_id: string
          product_mapping_id: string
          provider_cost_cents?: number | null
          provider_currency?: string | null
          provider_name: string
          provider_snapshot?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_value?: string | null
          sku?: string | null
          status?: string
          sync_variant_id: number
          updated_at?: string
        }
        Update: {
          availability_status?: string
          catalog_variant_id?: number
          color_value?: string | null
          created_at?: string
          id?: string
          last_catalog_sync_id?: string | null
          last_synced_at?: string
          merch_variant_id?: string
          product_mapping_id?: string
          provider_cost_cents?: number | null
          provider_currency?: string | null
          provider_name?: string
          provider_snapshot?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_value?: string | null
          sku?: string | null
          status?: string
          sync_variant_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "printful_variant_mappings_merch_variant_id_fkey"
            columns: ["merch_variant_id"]
            isOneToOne: true
            referencedRelation: "merch_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printful_variant_mappings_product_mapping_id_fkey"
            columns: ["product_mapping_id"]
            isOneToOne: false
            referencedRelation: "printful_product_mappings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printful_variant_mappings_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printful_variant_mappings_sync_run_fkey"
            columns: ["last_catalog_sync_id"]
            isOneToOne: false
            referencedRelation: "printful_catalog_sync_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          body: string
          created_at: string
          id: string
          item_id: string
          rating: number | null
          sentiment: string
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          item_id: string
          rating?: number | null
          sentiment?: string
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          item_id?: string
          rating?: number | null
          sentiment?: string
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_updates: {
        Row: {
          author_id: string
          body: string | null
          created_at: string
          id: string
          item_id: string
          status: string
          title: string
          updated_at: string
          version_label: string | null
        }
        Insert: {
          author_id: string
          body?: string | null
          created_at?: string
          id?: string
          item_id: string
          status?: string
          title: string
          updated_at?: string
          version_label?: string | null
        }
        Update: {
          author_id?: string
          body?: string | null
          created_at?: string
          id?: string
          item_id?: string
          status?: string
          title?: string
          updated_at?: string
          version_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_updates_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_updates_product_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_external_links: {
        Row: {
          created_at: string
          id: string
          label: string
          platform: string
          profile_id: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          platform: string
          profile_id: string
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          platform?: string
          profile_id?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_external_links_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country_code: string | null
          created_at: string
          creator_type: string | null
          display_currency: string | null
          display_name: string | null
          home_country_code: string | null
          home_currency: string | null
          id: string
          is_official: boolean
          is_published: boolean
          item_market_mode: string
          role: string
          service_market_mode: string
          slug: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country_code?: string | null
          created_at?: string
          creator_type?: string | null
          display_currency?: string | null
          display_name?: string | null
          home_country_code?: string | null
          home_currency?: string | null
          id: string
          is_official?: boolean
          is_published?: boolean
          item_market_mode?: string
          role?: string
          service_market_mode?: string
          slug?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country_code?: string | null
          created_at?: string
          creator_type?: string | null
          display_currency?: string | null
          display_name?: string | null
          home_country_code?: string | null
          home_currency?: string | null
          id?: string
          is_official?: boolean
          is_published?: boolean
          item_market_mode?: string
          role?: string
          service_market_mode?: string
          slug?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      provider_webhook_events: {
        Row: {
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          processing_status: string
          provider: string
          provider_event_id: string
          received_at: string
          signature_verified: boolean
        }
        Insert: {
          error_message?: string | null
          event_type: string
          id?: string
          payload: Json
          processed_at?: string | null
          processing_status?: string
          provider: string
          provider_event_id: string
          received_at?: string
          signature_verified?: boolean
        }
        Update: {
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          processing_status?: string
          provider?: string
          provider_event_id?: string
          received_at?: string
          signature_verified?: boolean
        }
        Relationships: []
      }
      publishing_runtime_controls: {
        Row: {
          phase: string
          review_required: boolean
          singleton: boolean
          updated_at: string
        }
        Insert: {
          phase?: string
          review_required?: boolean
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          phase?: string
          review_required?: boolean
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      radio_playlist_entries: {
        Row: {
          added_at: string
          added_by: string | null
          id: string
          is_active: boolean
          sort_order: number
          track_id: string
          updated_at: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          track_id: string
          updated_at?: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          track_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "radio_playlist_entries_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radio_playlist_entries_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: true
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_bookmarks: {
        Row: {
          created_at: string
          id: string
          item_id: string
          page_number: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          page_number: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          page_number?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_bookmarks_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_progress: {
        Row: {
          appearance: Json
          item_id: string
          page_number: number
          progress_percent: number
          total_pages: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          appearance?: Json
          item_id: string
          page_number?: number
          progress_percent?: number
          total_pages?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          appearance?: Json
          item_id?: string
          page_number?: number
          progress_percent?: number
          total_pages?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_progress_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      reply_likes: {
        Row: {
          created_at: string
          profile_id: string
          reply_id: string
        }
        Insert: {
          created_at?: string
          profile_id: string
          reply_id: string
        }
        Update: {
          created_at?: string
          profile_id?: string
          reply_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reply_likes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reply_likes_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "post_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      sample_pack_files: {
        Row: {
          created_at: string
          duration_seconds: number | null
          file_size_bytes: number | null
          id: string
          item_id: string
          mime_type: string | null
          preview_url: string | null
          sort_order: number
          source_asset_id: string | null
          title: string
          updated_at: string
          waveform_peaks: Json
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          file_size_bytes?: number | null
          id?: string
          item_id: string
          mime_type?: string | null
          preview_url?: string | null
          sort_order?: number
          source_asset_id?: string | null
          title: string
          updated_at?: string
          waveform_peaks?: Json
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          file_size_bytes?: number | null
          id?: string
          item_id?: string
          mime_type?: string | null
          preview_url?: string | null
          sort_order?: number
          source_asset_id?: string | null
          title?: string
          updated_at?: string
          waveform_peaks?: Json
        }
        Relationships: [
          {
            foreignKeyName: "sample_pack_files_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sample_pack_files_source_asset_id_fkey"
            columns: ["source_asset_id"]
            isOneToOne: true
            referencedRelation: "item_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      sample_playback_progress: {
        Row: {
          duration_seconds: number | null
          item_id: string
          position_seconds: number
          sample_file_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          duration_seconds?: number | null
          item_id: string
          position_seconds?: number
          sample_file_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          duration_seconds?: number | null
          item_id?: string
          position_seconds?: number
          sample_file_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sample_playback_progress_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sample_playback_progress_sample_file_id_fkey"
            columns: ["sample_file_id"]
            isOneToOne: false
            referencedRelation: "sample_pack_files"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      services: {
        Row: {
          author_id: string | null
          available_locally_only: boolean
          cover_url: string | null
          created_at: string
          delivery_estimate: string | null
          feature_description: string | null
          featured: boolean
          id: string
          local_currency: string | null
          local_price_cents: number | null
          long_description: string
          market_mode: string
          service_category_id: string | null
          service_type: string | null
          short_description: string
          slug: string
          starting_price_cents: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          available_locally_only?: boolean
          cover_url?: string | null
          created_at?: string
          delivery_estimate?: string | null
          feature_description?: string | null
          featured?: boolean
          id?: string
          local_currency?: string | null
          local_price_cents?: number | null
          long_description: string
          market_mode?: string
          service_category_id?: string | null
          service_type?: string | null
          short_description: string
          slug: string
          starting_price_cents?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          available_locally_only?: boolean
          cover_url?: string | null
          created_at?: string
          delivery_estimate?: string | null
          feature_description?: string | null
          featured?: boolean
          id?: string
          local_currency?: string | null
          local_price_cents?: number | null
          long_description?: string
          market_mode?: string
          service_category_id?: string | null
          service_type?: string | null
          short_description?: string
          slug?: string
          starting_price_cents?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_service_category_id_fkey"
            columns: ["service_category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      support_case_events: {
        Row: {
          actor_id: string | null
          body: string | null
          case_id: string
          created_at: string
          event_type: string
          id: string
          metadata: Json
          visibility: string
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          case_id: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          visibility: string
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          case_id?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_case_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_case_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "support_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      support_cases: {
        Row: {
          assigned_to: string | null
          case_number: number
          created_at: string
          id: string
          priority: string
          reply_owner: string | null
          requester_email: string
          requester_id: string | null
          resolved_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          case_number?: never
          created_at?: string
          id?: string
          priority?: string
          reply_owner?: string | null
          requester_email: string
          requester_id?: string | null
          resolved_at?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          case_number?: never
          created_at?: string
          id?: string
          priority?: string
          reply_owner?: string | null
          requester_email?: string
          requester_id?: string | null
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_cases_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_cases_reply_owner_fkey"
            columns: ["reply_owner"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          audio_url: string | null
          created_at: string
          download_url: string | null
          duration_seconds: number | null
          id: string
          item_id: string
          number: number
          title: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          download_url?: string | null
          duration_seconds?: number | null
          id?: string
          item_id: string
          number: number
          title: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          download_url?: string | null
          duration_seconds?: number | null
          id?: string
          item_id?: string
          number?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracks_product_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          item_id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          item_id: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          item_id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "item_achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_product_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_state: {
        Row: {
          hidden_notification_ids: string[]
          seen_notification_ids: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          hidden_notification_ids?: string[]
          seen_notification_ids?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          hidden_notification_ids?: string[]
          seen_notification_ids?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_points_ledger: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          points: number
          reason: string | null
          source_id: string | null
          source_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          points: number
          reason?: string | null
          source_id?: string | null
          source_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          points?: number
          reason?: string | null
          source_id?: string | null
          source_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_points_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_theme_preferences: {
        Row: {
          created_at: string
          theme_accent: string
          theme_mode: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          theme_accent?: string
          theme_mode?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          theme_accent?: string
          theme_mode?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_theme_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      community_collaboration_content: {
        Row: {
          author_id: string | null
          body: string | null
          created_at: string | null
          id: string | null
          item_id: string | null
          project_type: string | null
          role_needed: string | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_entries_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_entries_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      community_collaboration_response_content: {
        Row: {
          author_id: string | null
          body: string | null
          collaboration_id: string | null
          created_at: string | null
          id: string | null
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          body?: string | null
          collaboration_id?: string | null
          created_at?: string | null
          id?: string | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          body?: string | null
          collaboration_id?: string | null
          created_at?: string | null
          id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_replies_entry_id_fkey"
            columns: ["collaboration_id"]
            isOneToOne: false
            referencedRelation: "community_collaboration_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_replies_entry_id_fkey"
            columns: ["collaboration_id"]
            isOneToOne: false
            referencedRelation: "community_discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_replies_entry_id_fkey"
            columns: ["collaboration_id"]
            isOneToOne: false
            referencedRelation: "community_question_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_replies_entry_id_fkey"
            columns: ["collaboration_id"]
            isOneToOne: false
            referencedRelation: "community_review_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_replies_entry_id_fkey"
            columns: ["collaboration_id"]
            isOneToOne: false
            referencedRelation: "community_update_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_replies_entry_id_fkey"
            columns: ["collaboration_id"]
            isOneToOne: false
            referencedRelation: "content_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      community_discussion_likes: {
        Row: {
          created_at: string | null
          post_id: string | null
          profile_id: string | null
        }
        Insert: {
          created_at?: string | null
          post_id?: string | null
          profile_id?: string | null
        }
        Update: {
          created_at?: string | null
          post_id?: string | null
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_entry_reactions_entry_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_collaboration_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_entry_reactions_entry_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_entry_reactions_entry_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_question_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_entry_reactions_entry_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_review_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_entry_reactions_entry_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_update_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_entry_reactions_entry_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "content_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_entry_reactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_discussion_replies: {
        Row: {
          author_id: string | null
          body: string | null
          created_at: string | null
          id: string | null
          parent_reply_id: string | null
          post_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          body?: string | null
          created_at?: string | null
          id?: string | null
          parent_reply_id?: string | null
          post_id?: string | null
          status?: never
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          body?: string | null
          created_at?: string | null
          id?: string | null
          parent_reply_id?: string | null
          post_id?: string | null
          status?: never
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_replies_entry_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_collaboration_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_replies_entry_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_replies_entry_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_question_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_replies_entry_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_review_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_replies_entry_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_update_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_replies_entry_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "content_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_replies_parent_reply_id_fkey"
            columns: ["parent_reply_id"]
            isOneToOne: false
            referencedRelation: "community_collaboration_response_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_replies_parent_reply_id_fkey"
            columns: ["parent_reply_id"]
            isOneToOne: false
            referencedRelation: "community_discussion_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_replies_parent_reply_id_fkey"
            columns: ["parent_reply_id"]
            isOneToOne: false
            referencedRelation: "community_question_answer_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_replies_parent_reply_id_fkey"
            columns: ["parent_reply_id"]
            isOneToOne: false
            referencedRelation: "content_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      community_discussions: {
        Row: {
          author_id: string | null
          body: string | null
          created_at: string | null
          id: string | null
          slug: string | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          body?: string | null
          created_at?: string | null
          id?: string | null
          slug?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          body?: string | null
          created_at?: string | null
          id?: string | null
          slug?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_entries_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_question_answer_content: {
        Row: {
          author_id: string | null
          body: string | null
          created_at: string | null
          id: string | null
          is_accepted: boolean | null
          question_id: string | null
          updated_at: string | null
          vote_count: number | null
        }
        Insert: {
          author_id?: string | null
          body?: string | null
          created_at?: string | null
          id?: string | null
          is_accepted?: boolean | null
          question_id?: string | null
          updated_at?: string | null
          vote_count?: never
        }
        Update: {
          author_id?: string | null
          body?: string | null
          created_at?: string | null
          id?: string | null
          is_accepted?: boolean | null
          question_id?: string | null
          updated_at?: string | null
          vote_count?: never
        }
        Relationships: [
          {
            foreignKeyName: "content_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_replies_entry_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "community_collaboration_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_replies_entry_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "community_discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_replies_entry_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "community_question_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_replies_entry_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "community_review_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_replies_entry_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "community_update_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_replies_entry_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "content_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      community_question_content: {
        Row: {
          accepted_answer_id: string | null
          answer_count: number | null
          author_id: string | null
          body: string | null
          created_at: string | null
          has_accepted_answer: boolean | null
          id: string | null
          item_id: string | null
          status: string | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          vote_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_entries_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_entries_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_question_details_accepted_reply_id_fkey"
            columns: ["accepted_answer_id"]
            isOneToOne: false
            referencedRelation: "community_collaboration_response_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_question_details_accepted_reply_id_fkey"
            columns: ["accepted_answer_id"]
            isOneToOne: false
            referencedRelation: "community_discussion_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_question_details_accepted_reply_id_fkey"
            columns: ["accepted_answer_id"]
            isOneToOne: false
            referencedRelation: "community_question_answer_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_question_details_accepted_reply_id_fkey"
            columns: ["accepted_answer_id"]
            isOneToOne: false
            referencedRelation: "content_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      community_question_vote_content: {
        Row: {
          answer_id: string | null
          id: string | null
          profile_id: string | null
          question_id: string | null
          value: number | null
        }
        Relationships: []
      }
      community_reply_likes: {
        Row: {
          created_at: string | null
          profile_id: string | null
          reply_id: string | null
        }
        Insert: {
          created_at?: string | null
          profile_id?: string | null
          reply_id?: string | null
        }
        Update: {
          created_at?: string | null
          profile_id?: string | null
          reply_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_reply_reactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reply_reactions_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "community_collaboration_response_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reply_reactions_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "community_discussion_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reply_reactions_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "community_question_answer_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reply_reactions_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "content_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      community_review_content: {
        Row: {
          body: string | null
          created_at: string | null
          id: string | null
          item_id: string | null
          rating: number | null
          sentiment: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_entries_author_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_entries_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      community_update_content: {
        Row: {
          author_id: string | null
          body: string | null
          created_at: string | null
          id: string | null
          item_id: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          version_label: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_entries_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_entries_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_content_answer: {
        Args: { target_question_id: string; target_reply_id: string }
        Returns: undefined
      }
      account_exists_for_email: {
        Args: { lookup_email: string }
        Returns: boolean
      }
      add_item_submission_child_tombstone: {
        Args: {
          reason: string
          target_child_type: string
          target_source_id: string
          target_submission_id: string
        }
        Returns: undefined
      }
      apply_newsletter_provider_unsubscribe: {
        Args: { target_email: string; target_provider_contact_id: string }
        Returns: undefined
      }
      approve_creator_payout_batch: {
        Args: { target_approval_digest: string; target_batch_id: string }
        Returns: undefined
      }
      approve_creator_tax_policy: {
        Args: {
          target_income_classification: string
          target_professional_reference: string
          target_version: number
        }
        Returns: undefined
      }
      archive_owned_item: { Args: { target_item_id: string }; Returns: string }
      attest_owned_item_rights: {
        Args: {
          accepted: boolean
          target_item_id: string
          target_policy_version?: string
        }
        Returns: string
      }
      beat_catalog_enabled: { Args: never; Returns: boolean }
      beat_configuration_health: {
        Args: { target_item_id: string }
        Returns: {
          code: string
          message: string
        }[]
      }
      beat_review_surfaces_enabled: { Args: never; Returns: boolean }
      begin_creator_seller_onboarding: {
        Args: {
          target_seller_type: string
          target_special_case?: string
          target_us_person_status: string
        }
        Returns: Json
      }
      begin_interactive_launch: {
        Args: { client_context?: Json; target_item_id: string }
        Returns: {
          entry_url: string
          expires_at: string
          manifest: Json
          session_id: string
          session_token: string
        }[]
      }
      begin_printful_catalog_sync: {
        Args: { target_started_by: string; target_store_id: number }
        Returns: string
      }
      bind_stripe_checkout_session: {
        Args: {
          target_expires_at: string
          target_order_id: string
          target_session_id: string
        }
        Returns: string
      }
      calendar_feed: {
        Args: { range_end: string; range_start: string }
        Returns: {
          country_code: string
          creator_id: string
          description: string
          ends_at: string
          format: string
          info_url: string
          item_cover_url: string
          item_slug: string
          locality: string
          online_url: string
          profile_slug: string
          profile_username: string
          region: string
          source_id: string
          source_type: string
          starts_at: string
          state: string
          timezone: string
          title: string
          venue_name: string
        }[]
      }
      can_access_item_file: { Args: { object_name: string }; Returns: boolean }
      can_manage_content: {
        Args: { target_entry_id: string }
        Returns: boolean
      }
      can_manage_item: { Args: { target_item_id: string }; Returns: boolean }
      can_read_content: { Args: { target_entry_id: string }; Returns: boolean }
      catalog_item_health: {
        Args: { target_item_id: string }
        Returns: {
          code: string
          message: string
        }[]
      }
      claim_application_email: {
        Args: { target_claim_token: string; target_event_id: string }
        Returns: {
          event_key: string
          id: string
          payload: Json
          recipient_email: string
          template_key: string
          template_version: number
        }[]
      }
      claim_item_submission_notification_events: {
        Args: { target_limit?: number }
        Returns: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          recipient_id: string
          submission_id: string
        }[]
      }
      complete_application_email: {
        Args: {
          target_claim_token: string
          target_event_id: string
          target_provider_message_id: string
        }
        Returns: undefined
      }
      complete_item_submission_notification_event: {
        Args: { target_error?: string; target_event_id: string }
        Returns: undefined
      }
      create_content_collaboration: {
        Args: {
          collaboration_body: string
          collaboration_project_type?: string
          collaboration_title: string
          needed_role?: string
          target_item_id?: string
        }
        Returns: string
      }
      create_content_discussion: {
        Args: {
          discussion_body: string
          discussion_slug: string
          discussion_title: string
          target_item_id?: string
        }
        Returns: string
      }
      create_content_question: {
        Args: {
          question_body: string
          question_tags?: string[]
          question_title: string
          target_item_id?: string
        }
        Returns: string
      }
      create_content_update: {
        Args: {
          target_item_id: string
          update_body: string
          update_title: string
          update_version_label?: string
        }
        Returns: string
      }
      create_creator_payout_batch: {
        Args: {
          target_currency: string
          target_cutoff_at: string
          target_idempotency_key: string
        }
        Returns: string
      }
      create_or_open_direct_conversation: {
        Args: { other_profile_id: string }
        Returns: string
      }
      create_stripe_pending_order: {
        Args: {
          target_buyer_id: string
          target_customer_email: string
          target_idempotency_key: string
          target_offer_ids: string[]
        }
        Returns: Json
      }
      create_stripe_pending_order_with_variants: {
        Args: {
          target_buyer_id: string
          target_customer_email: string
          target_idempotency_key: string
          target_merch_variant_ids: string[]
          target_offer_ids: string[]
        }
        Returns: Json
      }
      create_support_case: {
        Args: {
          target_body: string
          target_requester_email: string
          target_requester_id: string
          target_subject: string
        }
        Returns: string
      }
      creator_gross_earnings_cents: {
        Args: { target_creator_id: string }
        Returns: number
      }
      creator_paid_sales_state_code: {
        Args: { target_creator_id: string }
        Returns: string
      }
      creator_seller_state_code: {
        Args: { target_creator_id: string }
        Returns: string
      }
      decide_item_submission: {
        Args: {
          reason: string
          target_decision: string
          target_submission_id: string
        }
        Returns: undefined
      }
      delete_merch_product_image: {
        Args: { target_image_id: string }
        Returns: Json
      }
      delete_merch_product_image_v2: {
        Args: { target_image_id: string }
        Returns: Json
      }
      end_interactive_launch: {
        Args: { target_session_id: string; target_session_token: string }
        Returns: undefined
      }
      evaluate_item_achievements: {
        Args: {
          client_context?: Json
          requested_trigger_type: string
          target_item_id: string
          target_session_id?: string
        }
        Returns: {
          code: string
          description: string
          icon: string
          id: string
          title: string
          trigger_type: string
        }[]
      }
      expire_beat_reservations: { Args: never; Returns: number }
      external_link_host: { Args: { target_url: string }; Returns: string }
      external_link_is_valid: {
        Args: {
          target_platform: string
          target_scope: string
          target_url: string
        }
        Returns: boolean
      }
      fail_application_email: {
        Args: {
          target_ambiguous?: boolean
          target_claim_token: string
          target_error_code: string
          target_event_id: string
          target_retryable?: boolean
        }
        Returns: undefined
      }
      finalize_beat_license_purchase: {
        Args: { target_order_item_id: string; target_reservation_id?: string }
        Returns: string
      }
      finish_printful_catalog_sync: {
        Args: {
          target_error_message?: string
          target_product_count: number
          target_run_id: string
          target_status: string
          target_summary: Json
        }
        Returns: undefined
      }
      get_admin_commerce_diagnostics: { Args: never; Returns: Json }
      get_admin_content_detail: {
        Args: { target_item_id: string }
        Returns: Json
      }
      get_admin_dashboard_summary: { Args: never; Returns: Json }
      get_admin_person_detail: {
        Args: { target_profile_id: string }
        Returns: Json
      }
      get_admin_submission_detail: {
        Args: { target_submission_id: string }
        Returns: Json
      }
      get_creator_country_payout_route: {
        Args: { target_creator_id?: string }
        Returns: Json
      }
      get_creator_paid_sales_public_status: {
        Args: { target_creator_ids: string[] }
        Returns: {
          can_sell_paid: boolean
          creator_id: string
          state: string
        }[]
      }
      get_creator_paid_sales_state: {
        Args: { target_creator_id?: string }
        Returns: Json
      }
      get_creator_seller_onboarding_state: {
        Args: { target_creator_id?: string }
        Returns: Json
      }
      get_creator_total_plays: { Args: never; Returns: number }
      grant_achievement_entitlement: {
        Args: {
          target_achievement_id: string
          target_entitlement_type: string
          target_item_id: string
          target_user_id: string
        }
        Returns: string
      }
      grant_item_entitlement: {
        Args: {
          grant_reason?: string
          grant_source_id?: string
          grant_source_type?: string
          target_entitlement_type: string
          target_item_id: string
          target_user_id: string
        }
        Returns: string
      }
      has_active_beat_file_grant: {
        Args: { target_asset_id: string; target_user_id: string }
        Returns: boolean
      }
      has_item_entitlement: {
        Args: {
          target_entitlement_type: string
          target_item_id: string
          target_user_id: string
        }
        Returns: boolean
      }
      is_allowed_interactive_url: {
        Args: { target_url: string }
        Returns: boolean
      }
      is_approved_publisher: {
        Args: { target_profile_id?: string }
        Returns: boolean
      }
      is_beat_item: { Args: { target_item_id: string }; Returns: boolean }
      is_commerce_order_seller: {
        Args: { target_order_id: string }
        Returns: boolean
      }
      is_conversation_member: {
        Args: { p_conversation_id: string; p_profile_id: string }
        Returns: boolean
      }
      is_creator_paid_sales_enabled: {
        Args: { target_creator_id: string }
        Returns: boolean
      }
      is_creator_tax_reviewer: { Args: never; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      is_safe_public_https_url: { Args: { value: string }; Returns: boolean }
      is_valid_iana_timezone: { Args: { value: string }; Returns: boolean }
      issue_item_achievement: {
        Args: {
          event_metadata?: Json
          target_achievement_id: string
          target_item_id: string
          target_user_id: string
        }
        Returns: boolean
      }
      list_admin_content: {
        Args: {
          target_limit?: number
          target_offset?: number
          target_query?: string
          target_status?: string
          target_type?: string
        }
        Returns: {
          assigned_type: string
          cover_url: string
          created_at: string
          creator_id: string
          creator_name: string
          creator_username: string
          experience_type: string
          item_id: string
          item_type: string
          pending_submission_id: string
          publication_status: string
          review_status: string
          slug: string
          title: string
          total_count: number
          updated_at: string
        }[]
      }
      list_admin_error_events: {
        Args: {
          target_limit?: number
          target_offset?: number
          target_path?: string
          target_release?: string
          target_since?: string
        }
        Returns: {
          error_code: string
          error_digest: string
          error_name: string
          framework_context: Json
          id: string
          method: string
          occurred_at: string
          path: string
          release: string
          runtime: string
          safe_message: string
        }[]
      }
      list_admin_error_events_page: {
        Args: {
          target_limit?: number
          target_offset?: number
          target_path?: string
          target_release?: string
          target_since?: string
        }
        Returns: {
          error_code: string
          error_digest: string
          error_name: string
          framework_context: Json
          id: string
          method: string
          occurred_at: string
          path: string
          release: string
          runtime: string
          safe_message: string
          total_count: number
        }[]
      }
      list_admin_people: {
        Args: {
          target_limit?: number
          target_offset?: number
          target_query?: string
          target_role?: string
        }
        Returns: {
          avatar_url: string
          creator_type: string
          display_name: string
          email: string
          email_confirmed_at: string
          item_count: number
          last_sign_in_at: string
          profile_id: string
          profile_missing: boolean
          profile_role: string
          signed_up_at: string
          total_count: number
          username: string
        }[]
      }
      list_admin_submission_queue: {
        Args: {
          target_limit?: number
          target_offset?: number
          target_status?: string
        }
        Returns: {
          creator_name: string
          decided_at: string
          decision_reason: string
          item_id: string
          item_slug: string
          item_title: string
          pending_notification_count: number
          status: string
          submission_id: string
          submission_kind: string
          submitted_at: string
          submitter_id: string
        }[]
      }
      list_item_asset_manifest: {
        Args: { target_item_id: string }
        Returns: {
          asset_type: string
          created_at: string
          file_url: string
          id: string
          is_downloadable: boolean
          is_unlocked: boolean
          item_id: string
          sort_order: number
          storage_path: string
          title: string
        }[]
      }
      list_managed_catalog_health: {
        Args: never
        Returns: {
          issue_codes: string[]
          issue_count: number
          issue_messages: string[]
          item_id: string
        }[]
      }
      moderate_creator_event: {
        Args: { reason?: string; target_event_id: string; target_state: string }
        Returns: undefined
      }
      notification_actor_name: { Args: { actor: string }; Returns: string }
      process_stripe_webhook_event: {
        Args: {
          target_data: Json
          target_event_id: string
          target_event_type: string
        }
        Returns: Json
      }
      publishing_review_is_required: { Args: never; Returns: boolean }
      queue_application_email: {
        Args: {
          target_event_key: string
          target_payload: Json
          target_recipient_email: string
          target_recipient_user_id: string
          target_source_id: string
          target_source_kind: string
          target_template_key: string
          target_template_version: number
        }
        Returns: string
      }
      queue_fulfillment_email: {
        Args: {
          target_detail: string
          target_order_id: string
          target_provider_event_id: string
          target_status: string
          target_tracking_number?: string
          target_tracking_url?: string
        }
        Returns: string
      }
      queue_welcome_email: {
        Args: { target_library_url: string; target_user_id: string }
        Returns: string
      }
      reconcile_application_email: {
        Args: {
          target_event_id: string
          target_provider_message_id: string
          target_reason: string
          target_resolution: string
        }
        Returns: {
          attempt_count: number
          claim_token: string | null
          claimed_at: string | null
          created_at: string
          event_key: string
          id: string
          last_error_at: string | null
          last_error_code: string | null
          next_attempt_at: string
          payload: Json
          provider_message_id: string | null
          recipient_email: string
          recipient_user_id: string | null
          sent_at: string | null
          source_id: string | null
          source_kind: string
          status: string
          template_key: string
          template_version: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "email_outbox_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reconcile_creator_wise_manual_payout: {
        Args: {
          target_evidence_digest: string
          target_payout_item_id: string
          target_reconciliation_digest: string
          target_result: string
        }
        Returns: undefined
      }
      record_achievement_playback_signal: {
        Args: {
          signal_metadata?: Json
          target_item_id: string
          target_session_id: string
          target_signal_type: string
          target_track_id: string
        }
        Returns: undefined
      }
      record_beat_file_download: {
        Args: {
          target_beat_file_id: string
          target_grant_id: string
          target_ip_hash?: string
          target_user_agent?: string
        }
        Returns: string
      }
      record_creator_earnings_adjustment: {
        Args: {
          target_amount_cents: number
          target_entry_type: string
          target_event_id: string
          target_order_id: string
          target_sign: number
        }
        Returns: number
      }
      record_creator_wise_manual_transfer: {
        Args: {
          target_evidence_digest: string
          target_exchange_rate: number
          target_fee_cents: number
          target_payout_item_id: string
          target_provider_reference: string
          target_source_amount_cents: number
          target_source_currency: string
          target_target_amount_minor: number
          target_target_currency: string
        }
        Returns: undefined
      }
      record_email_provider_event: {
        Args: {
          target_event_type: string
          target_failure_class: string
          target_metadata?: Json
          target_occurred_at: string
          target_provider_event_id: string
          target_provider_message_id: string
          target_recipient_email: string
        }
        Returns: string
      }
      record_interactive_progress: {
        Args: {
          event_payload: Json
          target_event_key: string
          target_occurred_at?: string
          target_sequence_number: number
          target_session_id: string
          target_session_token: string
        }
        Returns: string
      }
      record_item_play: {
        Args: {
          target_item_id: string
          target_play_reason?: string
          target_playback_mode?: string
          target_session_id: string
          target_track_id: string
        }
        Returns: boolean
      }
      record_item_share_visit: {
        Args: { target_item_id: string; target_referrer_id: string }
        Returns: boolean
      }
      record_item_submission_event: {
        Args: {
          target_event_type: string
          target_payload?: Json
          target_recipient_id: string
          target_submission_id: string
        }
        Returns: undefined
      }
      record_sanitized_error_event: {
        Args: {
          target_error_code?: string
          target_error_digest?: string
          target_error_name: string
          target_framework_context?: Json
          target_method: string
          target_occurred_at: string
          target_path: string
          target_release: string
          target_runtime: string
          target_safe_message?: string
        }
        Returns: string
      }
      record_support_reply: {
        Args: { target_body: string; target_case_id: string }
        Returns: string
      }
      record_trusted_interactive_event: {
        Args: {
          event_payload: Json
          target_event_key: string
          target_external_event_id: string
          target_item_id: string
          target_occurred_at: string
          target_replay_nonce: string
          target_session_id: string
          target_signature_sha256: string
          target_signing_key_id: string
          target_user_id: string
        }
        Returns: {
          achievement_issued: boolean
          event_id: string
        }[]
      }
      recover_stale_application_email_claims: { Args: never; Returns: number }
      refresh_content_question_stats: {
        Args: { target_entry_id: string }
        Returns: undefined
      }
      refresh_creator_paid_offers: {
        Args: { target_creator_id: string }
        Returns: undefined
      }
      refresh_paid_entitlement: {
        Args: {
          target_entitlement_type: string
          target_item_id: string
          target_reason: string
          target_user_id: string
        }
        Returns: undefined
      }
      replace_own_profile_external_links: {
        Args: { link_rows: Json }
        Returns: undefined
      }
      replace_owned_item_external_links: {
        Args: { link_rows: Json; target_item_id: string }
        Returns: undefined
      }
      replace_owned_item_video_embeds: {
        Args: { target_embeds?: Json; target_item_id: string }
        Returns: undefined
      }
      report_content: {
        Args: {
          report_details?: string
          report_reason?: string
          target_entry_id?: string
          target_reply_id?: string
        }
        Returns: string
      }
      reserve_exclusive_beat_offer: {
        Args: {
          target_buyer_id: string
          target_idempotency_key: string
          target_offer_id: string
          target_order_id?: string
          target_ttl_seconds?: number
        }
        Returns: string
      }
      resolve_content_report: {
        Args: {
          target_moderation_status?: string
          target_report_id: string
          target_resolution_note?: string
          target_status: string
        }
        Returns: undefined
      }
      review_creator_tax_document: {
        Args: {
          target_decision: string
          target_document_id: string
          target_reason: string
        }
        Returns: undefined
      }
      revoke_item_entitlement: {
        Args: { revoke_reason: string; target_entitlement_id: string }
        Returns: undefined
      }
      save_creator_event: {
        Args: { payload: Json; target_event_id: string }
        Returns: string
      }
      save_interactive_build: {
        Args: { payload: Json; target_item_id: string }
        Returns: string
      }
      save_interactive_event_definition: {
        Args: { payload: Json; target_item_id: string }
        Returns: string
      }
      save_item_to_library: {
        Args: { target_item_id: string }
        Returns: string
      }
      save_owned_beat_draft: {
        Args: {
          target_attribute_term_ids: string[]
          target_bpm: number
          target_cover_url: string
          target_description: string
          target_external_url: string
          target_item_id: string
          target_key_mode: string
          target_key_not_applicable: boolean
          target_key_root: string
          target_preview_duration: number
          target_preview_url: string
          target_private_files: Json
          target_release_date: string
          target_sample_disclosure: string
          target_sample_status: string
          target_tag_ids: string[]
          target_tier_prices: Json
          target_time_signature: string
          target_title: string
        }
        Returns: string
      }
      save_reading_progress: {
        Args: {
          target_appearance?: Json
          target_item_id: string
          target_page: number
          target_total_pages: number
        }
        Returns: {
          appearance: Json
          item_id: string
          page_number: number
          progress_percent: number
          total_pages: number | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "reading_progress"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_sample_playback_progress: {
        Args: {
          target_duration_seconds?: number
          target_position_seconds: number
          target_sample_file_id: string
        }
        Returns: {
          duration_seconds: number | null
          item_id: string
          position_seconds: number
          sample_file_id: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "sample_playback_progress"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      send_direct_message: {
        Args: { message_body: string; target_conversation_id: string }
        Returns: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_admin_creator_access: {
        Args: {
          target_profile_id: string
          target_reason: string
          target_role: string
        }
        Returns: undefined
      }
      set_admin_creator_paid_sales: {
        Args: {
          target_creator_id: string
          target_reason: string
          target_status: string
        }
        Returns: Json
      }
      set_admin_creator_payout_country_route: {
        Args: {
          requested_currency: string
          target_country_code: string
          target_evidence_reference: string
          target_revalidate_after: string
          target_status: string
        }
        Returns: string
      }
      set_admin_creator_tax_reviewer: {
        Args: { target_enabled: boolean; target_user_id: string }
        Returns: undefined
      }
      set_admin_item_lifecycle: {
        Args: {
          target_action: string
          target_item_id: string
          target_reason: string
        }
        Returns: string
      }
      set_admin_offer_lifecycle: {
        Args: {
          target_action: string
          target_offer_id: string
          target_reason: string
        }
        Returns: string
      }
      set_beat_license_grant_status: {
        Args: { target_grant_id: string; target_status: string }
        Returns: undefined
      }
      set_creator_event_state: {
        Args: { target_event_id: string; target_state: string }
        Returns: undefined
      }
      set_creator_payout_item_withholding: {
        Args: {
          target_payout_item_id: string
          target_reason: string
          target_withheld_tax_cents: number
        }
        Returns: undefined
      }
      set_creator_payout_runtime_controls: {
        Args: {
          target_batching_enabled: boolean
          target_emergency_stop: boolean
          target_minimum_payout_cents: number
          target_operator_recording_enabled: boolean
          target_policy_version: number
          target_reconciliation_enabled: boolean
        }
        Returns: undefined
      }
      set_email_delivery_control: {
        Args: {
          target_control: string
          target_enabled: boolean
          target_reason: string
        }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          delivery_enabled: boolean
          newsletter_sync_enabled: boolean
          singleton: boolean
          support_intake_enabled: boolean
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "email_delivery_controls"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_item_upcoming_release: {
        Args: {
          release_at: string
          release_timezone: string
          target_item_id: string
        }
        Returns: undefined
      }
      set_merch_product_image: {
        Args: {
          target_color_value: string
          target_created_by: string
          target_file_url: string
          target_item_id: string
          target_role: string
          target_storage_path: string
          target_title: string
        }
        Returns: Json
      }
      set_merch_product_image_v2: {
        Args: {
          target_byte_size: number
          target_color_value: string
          target_content_sha256: string
          target_content_type: string
          target_created_by: string
          target_featured?: boolean
          target_file_url: string
          target_item_id: string
          target_original_filename: string
          target_role: string
          target_storage_path: string
          target_title: string
        }
        Returns: Json
      }
      set_newsletter_consent: {
        Args: {
          target_policy_version: string
          target_source?: string
          target_subscribed: boolean
        }
        Returns: {
          consent_source: string
          consented_at: string | null
          email_normalized: string
          last_sync_error: string | null
          policy_version: string
          provider_contact_id: string | null
          provider_topic_id: string | null
          revoked_at: string | null
          status: string
          sync_attempts: number
          sync_claimed_at: string | null
          sync_status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "newsletter_consents"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_owned_item_publication_status: {
        Args: { target_item_id: string; target_status: string }
        Returns: undefined
      }
      set_profile_role: {
        Args: { target_profile_id: string; target_role: string }
        Returns: undefined
      }
      snapshot_item_for_submission: {
        Args: { target_item_id: string; target_submission_id: string }
        Returns: undefined
      }
      snapshot_item_for_submission_core: {
        Args: { target_item_id: string; target_submission_id: string }
        Returns: undefined
      }
      store_creator_payout_destination: {
        Args: {
          target_auth_tag: string
          target_ciphertext: string
          target_creator_id: string
          target_digest: string
          target_iv: string
          target_key_version: number
          target_masked_display: string
          target_route_id: string
        }
        Returns: string
      }
      store_creator_tax_document: {
        Args: {
          target_auth_tag: string
          target_byte_length: number
          target_ciphertext: string
          target_creator_id: string
          target_digest: string
          target_expires_at: string
          target_form_revision: string
          target_form_type: string
          target_iv: string
          target_key_version: number
          target_signed_at: string
        }
        Returns: string
      }
      submit_item_for_review: {
        Args: {
          target_idempotency_key: string
          target_item_id: string
          target_policy_version?: string
        }
        Returns: string
      }
      sync_creator_payout_capability: {
        Args: {
          target_capabilities?: Json
          target_country_code: string
          target_creator_id: string
          target_currency: string
          target_provider: string
          target_provider_recipient_ref: string
          target_reason_code?: string
          target_requirements_due?: string[]
          target_status: string
        }
        Returns: Json
      }
      sync_managed_item_achievements: {
        Args: { achievement_rows: Json; target_item_id: string }
        Returns: undefined
      }
      toggle_reading_bookmark: {
        Args: { target_item_id: string; target_page: number }
        Returns: boolean
      }
      update_creator_order_fulfillment: {
        Args: { target_order_item_id: string; target_status: string }
        Returns: undefined
      }
      update_merch_product_image_v2: {
        Args: {
          target_featured: boolean
          target_image_id: string
          target_sort_order: number
        }
        Returns: undefined
      }
      update_owned_item: {
        Args: { patch: Json; target_item_id: string }
        Returns: undefined
      }
      update_support_case: {
        Args: {
          target_assigned_to: string
          target_case_id: string
          target_note?: string
          target_reply_owner: string
          target_status: string
        }
        Returns: undefined
      }
      upsert_content_review: {
        Args: {
          review_body: string
          review_rating?: number
          review_sentiment?: string
          review_title?: string
          target_item_id: string
        }
        Returns: string
      }
      withdraw_item_submission: {
        Args: { reason?: string; target_submission_id: string }
        Returns: undefined
      }
      youtube_video_id_from_url: {
        Args: { target_url: string }
        Returns: string
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
