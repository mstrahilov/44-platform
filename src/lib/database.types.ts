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
          short_description: string | null
          slug: string
          sort_order: number | null
          status: string
          streaming_enabled: boolean
          tags: string[]
          title: string
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
          short_description?: string | null
          slug: string
          sort_order?: number | null
          status?: string
          streaming_enabled?: boolean
          tags?: string[]
          title: string
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
          short_description?: string | null
          slug?: string
          sort_order?: number | null
          status?: string
          streaming_enabled?: boolean
          tags?: string[]
          title?: string
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
          fulfillment_status: string
          id: string
          item_id: string
          item_title: string
          line_total_cents: number
          offer_id: string
          offer_title: string
          offer_type: string
          order_id: string
          quantity: number
          seller_id: string | null
          unit_price_cents: number
        }
        Insert: {
          created_at?: string
          currency: string
          fulfillment_status?: string
          id?: string
          item_id: string
          item_title: string
          line_total_cents: number
          offer_id: string
          offer_title: string
          offer_type: string
          order_id: string
          quantity?: number
          seller_id?: string | null
          unit_price_cents: number
        }
        Update: {
          created_at?: string
          currency?: string
          fulfillment_status?: string
          id?: string
          item_id?: string
          item_title?: string
          line_total_cents?: number
          offer_id?: string
          offer_title?: string
          offer_type?: string
          order_id?: string
          quantity?: number
          seller_id?: string | null
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
          created_at: string
          currency: string
          discount_cents: number
          id: string
          idempotency_key: string
          paid_at: string | null
          placed_at: string | null
          provider: string | null
          provider_order_id: string | null
          shipping_cents: number
          status: string
          subtotal_cents: number
          tax_cents: number
          total_cents: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          canceled_at?: string | null
          created_at?: string
          currency?: string
          discount_cents?: number
          id?: string
          idempotency_key?: string
          paid_at?: string | null
          placed_at?: string | null
          provider?: string | null
          provider_order_id?: string | null
          shipping_cents?: number
          status?: string
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          canceled_at?: string | null
          created_at?: string
          currency?: string
          discount_cents?: number
          id?: string
          idempotency_key?: string
          paid_at?: string | null
          placed_at?: string | null
          provider?: string | null
          provider_order_id?: string | null
          shipping_cents?: number
          status?: string
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Relationships: []
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
      payment_attempts: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          failure_code: string | null
          failure_message: string | null
          id: string
          idempotency_key: string
          order_id: string
          provider: string
          provider_payment_id: string | null
          status: string
          succeeded_at: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency: string
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          idempotency_key: string
          order_id: string
          provider: string
          provider_payment_id?: string | null
          status?: string
          succeeded_at?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          idempotency_key?: string
          order_id?: string
          provider?: string
          provider_payment_id?: string | null
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
          hero_url: string | null
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
          hero_url?: string | null
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
          hero_url?: string | null
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
      can_manage_content: {
        Args: { target_entry_id: string }
        Returns: boolean
      }
      can_manage_item: { Args: { target_item_id: string }; Returns: boolean }
      can_read_content: { Args: { target_entry_id: string }; Returns: boolean }
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
      create_or_open_direct_conversation: {
        Args: { other_profile_id: string }
        Returns: string
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
      has_item_entitlement: {
        Args: {
          target_entitlement_type: string
          target_item_id: string
          target_user_id: string
        }
        Returns: boolean
      }
      is_conversation_member: {
        Args: { p_conversation_id: string; p_profile_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
      issue_item_achievement: {
        Args: {
          event_metadata?: Json
          target_achievement_id: string
          target_item_id: string
          target_user_id: string
        }
        Returns: boolean
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
      notification_actor_name: { Args: { actor: string }; Returns: string }
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
      refresh_content_question_stats: {
        Args: { target_entry_id: string }
        Returns: undefined
      }
      revoke_item_entitlement: {
        Args: { revoke_reason: string; target_entitlement_id: string }
        Returns: undefined
      }
      save_item_to_library: {
        Args: { target_item_id: string }
        Returns: string
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
