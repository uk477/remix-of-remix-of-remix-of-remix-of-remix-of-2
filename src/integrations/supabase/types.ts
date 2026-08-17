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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          payload: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          payload?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          payload?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      balance_transactions: {
        Row: {
          balance_after: number
          created_at: string
          created_by: string | null
          delta: number
          id: string
          kind: string
          reason: string | null
          ref_id: string | null
          user_id: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          created_by?: string | null
          delta: number
          id?: string
          kind: string
          reason?: string | null
          ref_id?: string | null
          user_id: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          created_by?: string | null
          delta?: number
          id?: string
          kind?: string
          reason?: string | null
          ref_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      boost_notify_subscriptions: {
        Row: {
          created_at: string
          id: string
          region: string
          subcategory_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          region?: string
          subcategory_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          region?: string
          subcategory_id?: string
          user_id?: string
        }
        Relationships: []
      }
      boost_service_status: {
        Row: {
          api_ping_url: string | null
          down_since: string | null
          is_available: boolean
          last_checked_at: string | null
          last_error: string | null
          manual_override: string | null
          ping_expect_status: number
          ping_method: string
          region: string
          subcategory_id: string
          updated_at: string
        }
        Insert: {
          api_ping_url?: string | null
          down_since?: string | null
          is_available?: boolean
          last_checked_at?: string | null
          last_error?: string | null
          manual_override?: string | null
          ping_expect_status?: number
          ping_method?: string
          region?: string
          subcategory_id: string
          updated_at?: string
        }
        Update: {
          api_ping_url?: string | null
          down_since?: string | null
          is_available?: boolean
          last_checked_at?: string | null
          last_error?: string | null
          manual_override?: string | null
          ping_expect_status?: number
          ping_method?: string
          region?: string
          subcategory_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      boost_status_events: {
        Row: {
          created_at: string
          error: string | null
          event: string
          id: string
          notified_count: number
          region: string
          source: string
          subcategory_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          event: string
          id?: string
          notified_count?: number
          region?: string
          source?: string
          subcategory_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          event?: string
          id?: string
          notified_count?: number
          region?: string
          source?: string
          subcategory_id?: string
        }
        Relationships: []
      }
      broadcast_campaigns: {
        Row: {
          audience: Json
          body: string
          buttons: Json | null
          channel: string
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          sent_at: string | null
          stats: Json
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          audience?: Json
          body: string
          buttons?: Json | null
          channel?: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          sent_at?: string | null
          stats?: Json
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          audience?: Json
          body?: string
          buttons?: Json | null
          channel?: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          sent_at?: string | null
          stats?: Json
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      broadcast_reads: {
        Row: {
          broadcast_id: string
          seen_at: string
          user_id: string
        }
        Insert: {
          broadcast_id: string
          seen_at?: string
          user_id: string
        }
        Update: {
          broadcast_id?: string
          seen_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_reads_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "broadcast_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          icon: string | null
          id: string
          slug: string
          sort_order: number
          title_en: string
          title_ru: string
          title_zh: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          icon?: string | null
          id?: string
          slug: string
          sort_order?: number
          title_en: string
          title_ru: string
          title_zh: string
        }
        Update: {
          active?: boolean
          created_at?: string
          icon?: string | null
          id?: string
          slug?: string
          sort_order?: number
          title_en?: string
          title_ru?: string
          title_zh?: string
        }
        Relationships: []
      }
      follower_accounts: {
        Row: {
          account_url: string | null
          badge_en: string | null
          badge_ru: string | null
          category: string
          created_at: string
          description_en: string
          description_enabled: boolean
          description_ru: string
          features: Json
          followers: number
          id: string
          is_active: boolean
          name_en: string
          name_ru: string
          price_per_account: number
          slug: string | null
          smart_followers: number | null
          smart_followers_list: Json
          sort_order: number
          stock: number
          topic_id: string | null
          topic_ids: string[]
          updated_at: string
          verification: string
          x_sync_error: string | null
          x_synced_at: string | null
          year_range: string
        }
        Insert: {
          account_url?: string | null
          badge_en?: string | null
          badge_ru?: string | null
          category?: string
          created_at?: string
          description_en?: string
          description_enabled?: boolean
          description_ru?: string
          features?: Json
          followers?: number
          id?: string
          is_active?: boolean
          name_en: string
          name_ru: string
          price_per_account?: number
          slug?: string | null
          smart_followers?: number | null
          smart_followers_list?: Json
          sort_order?: number
          stock?: number
          topic_id?: string | null
          topic_ids?: string[]
          updated_at?: string
          verification?: string
          x_sync_error?: string | null
          x_synced_at?: string | null
          year_range?: string
        }
        Update: {
          account_url?: string | null
          badge_en?: string | null
          badge_ru?: string | null
          category?: string
          created_at?: string
          description_en?: string
          description_enabled?: boolean
          description_ru?: string
          features?: Json
          followers?: number
          id?: string
          is_active?: boolean
          name_en?: string
          name_ru?: string
          price_per_account?: number
          slug?: string | null
          smart_followers?: number | null
          smart_followers_list?: Json
          sort_order?: number
          stock?: number
          topic_id?: string | null
          topic_ids?: string[]
          updated_at?: string
          verification?: string
          x_sync_error?: string | null
          x_synced_at?: string | null
          year_range?: string
        }
        Relationships: []
      }
      maintenance_notify_subscriptions: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      maintenance_state: {
        Row: {
          enabled: boolean
          eta: string | null
          message_en: string
          message_ru: string
          singleton: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          eta?: string | null
          message_en?: string
          message_ru?: string
          singleton?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          eta?: string | null
          message_en?: string
          message_ru?: string
          singleton?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      maintenance_targets: {
        Row: {
          added_at: string
          added_by: string | null
          note: string | null
          user_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          note?: string | null
          user_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_targets_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_whitelist: {
        Row: {
          added_at: string
          added_by: string | null
          note: string | null
          user_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          note?: string | null
          user_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          admin_note: string | null
          amount_usd: number
          created_at: string
          id: string
          meta: Json
          product_id: string | null
          qty: number
          status: Database["public"]["Enums"]["order_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount_usd: number
          created_at?: string
          id?: string
          meta?: Json
          product_id?: string | null
          qty?: number
          status?: Database["public"]["Enums"]["order_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount_usd?: number
          created_at?: string
          id?: string
          meta?: Json
          product_id?: string | null
          qty?: number
          status?: Database["public"]["Enums"]["order_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_settings: {
        Row: {
          dated_markup: number
          fresh_markup: number
          min_price: number
          singleton: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          dated_markup?: number
          fresh_markup?: number
          min_price?: number
          singleton?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          dated_markup?: number
          fresh_markup?: number
          min_price?: number
          singleton?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          category_id: string | null
          created_at: string
          description_en: string | null
          description_ru: string | null
          description_zh: string | null
          id: string
          image_url: string | null
          price_usd: number
          slug: string | null
          sort_order: number
          stock: number
          tags: string[]
          title_en: string
          title_ru: string
          title_zh: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          description_en?: string | null
          description_ru?: string | null
          description_zh?: string | null
          id?: string
          image_url?: string | null
          price_usd: number
          slug?: string | null
          sort_order?: number
          stock?: number
          tags?: string[]
          title_en: string
          title_ru: string
          title_zh: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          description_en?: string | null
          description_ru?: string | null
          description_zh?: string | null
          id?: string
          image_url?: string | null
          price_usd?: number
          slug?: string | null
          sort_order?: number
          stock?: number
          tags?: string[]
          title_en?: string
          title_ru?: string
          title_zh?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          balance: number
          blocked: boolean
          created_at: string
          display_name: string | null
          id: string
          language: string
          last_seen_at: string | null
          telegram_id: string | null
          telegram_username: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          balance?: number
          blocked?: boolean
          created_at?: string
          display_name?: string | null
          id: string
          language?: string
          last_seen_at?: string | null
          telegram_id?: string | null
          telegram_username?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          balance?: number
          blocked?: boolean
          created_at?: string
          display_name?: string | null
          id?: string
          language?: string
          last_seen_at?: string | null
          telegram_id?: string | null
          telegram_username?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          active: boolean
          bonus_usd: number
          code: string
          created_at: string
          max_redemptions: number | null
          redeemed_count: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          bonus_usd: number
          code: string
          created_at?: string
          max_redemptions?: number | null
          redeemed_count?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          bonus_usd?: number
          code?: string
          created_at?: string
          max_redemptions?: number | null
          redeemed_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      promo_redemptions: {
        Row: {
          bonus_usd: number
          code: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          bonus_usd: number
          code: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          bonus_usd?: number
          code?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_redemptions_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["code"]
          },
        ]
      }
      supplier_applications: {
        Row: {
          admin_note: string | null
          agreed_guarantor: boolean
          archived: boolean
          created_at: string
          description: string
          id: string
          negotiable: boolean
          price: string | null
          service_name: string
          status: Database["public"]["Enums"]["supplier_status"]
          telegram: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_note?: string | null
          agreed_guarantor?: boolean
          archived?: boolean
          created_at?: string
          description: string
          id?: string
          negotiable?: boolean
          price?: string | null
          service_name: string
          status?: Database["public"]["Enums"]["supplier_status"]
          telegram: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_note?: string | null
          agreed_guarantor?: boolean
          archived?: boolean
          created_at?: string
          description?: string
          id?: string
          negotiable?: boolean
          price?: string | null
          service_name?: string
          status?: Database["public"]["Enums"]["supplier_status"]
          telegram?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          attachments: Json | null
          body: string
          created_at: string
          from_admin: boolean
          id: string
          sender: string
          thread_id: string
        }
        Insert: {
          attachments?: Json | null
          body: string
          created_at?: string
          from_admin?: boolean
          id?: string
          sender: string
          thread_id: string
        }
        Update: {
          attachments?: Json | null
          body?: string
          created_at?: string
          from_admin?: boolean
          id?: string
          sender?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "support_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      support_threads: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          status: string
          subject: string | null
          unread_admin: number
          unread_user: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          subject?: string | null
          unread_admin?: number
          unread_user?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          subject?: string | null
          unread_admin?: number
          unread_user?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      topups: {
        Row: {
          address: string
          amount_coin: number | null
          amount_usd: number
          check_error: string | null
          coin: string
          confirmations: number
          created_at: string
          detected_amount: number | null
          detected_at: string | null
          detected_tx_hash: string | null
          expires_at: string | null
          id: string
          last_checked_at: string | null
          network: string | null
          rate: number | null
          required_confirmations: number
          status: Database["public"]["Enums"]["topup_status"]
          tx_hash: string | null
          updated_at: string
          user_confirmed_at: string | null
          user_id: string
          verifier_state: string
        }
        Insert: {
          address: string
          amount_coin?: number | null
          amount_usd: number
          check_error?: string | null
          coin: string
          confirmations?: number
          created_at?: string
          detected_amount?: number | null
          detected_at?: string | null
          detected_tx_hash?: string | null
          expires_at?: string | null
          id?: string
          last_checked_at?: string | null
          network?: string | null
          rate?: number | null
          required_confirmations?: number
          status?: Database["public"]["Enums"]["topup_status"]
          tx_hash?: string | null
          updated_at?: string
          user_confirmed_at?: string | null
          user_id: string
          verifier_state?: string
        }
        Update: {
          address?: string
          amount_coin?: number | null
          amount_usd?: number
          check_error?: string | null
          coin?: string
          confirmations?: number
          created_at?: string
          detected_amount?: number | null
          detected_at?: string | null
          detected_tx_hash?: string | null
          expires_at?: string | null
          id?: string
          last_checked_at?: string | null
          network?: string | null
          rate?: number | null
          required_confirmations?: number
          status?: Database["public"]["Enums"]["topup_status"]
          tx_hash?: string | null
          updated_at?: string
          user_confirmed_at?: string | null
          user_id?: string
          verifier_state?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      x_profiles: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          description: string | null
          fetched_at: string
          followers: number
          following: number
          is_blue_verified: boolean
          is_verified: boolean
          joined_at: string | null
          name: string | null
          not_found: boolean
          user_name: string
          username_key: string
          verified_type: string | null
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          description?: string | null
          fetched_at?: string
          followers?: number
          following?: number
          is_blue_verified?: boolean
          is_verified?: boolean
          joined_at?: string | null
          name?: string | null
          not_found?: boolean
          user_name: string
          username_key: string
          verified_type?: string | null
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          description?: string | null
          fetched_at?: string
          followers?: number
          following?: number
          is_blue_verified?: boolean
          is_verified?: boolean
          joined_at?: string | null
          name?: string | null
          not_found?: boolean
          user_name?: string
          username_key?: string
          verified_type?: string | null
        }
        Relationships: []
      }
      x_sync_runs: {
        Row: {
          duration_ms: number
          error: string | null
          failed: number
          finished_at: string
          id: string
          not_found: number
          requested: number
          scope: string
          skipped: number
          source: string
          started_at: string
          updated: number
        }
        Insert: {
          duration_ms?: number
          error?: string | null
          failed?: number
          finished_at?: string
          id?: string
          not_found?: number
          requested?: number
          scope?: string
          skipped?: number
          source?: string
          started_at?: string
          updated?: number
        }
        Update: {
          duration_ms?: number
          error?: string | null
          failed?: number
          finished_at?: string
          id?: string
          not_found?: number
          requested?: number
          scope?: string
          skipped?: number
          source?: string
          started_at?: string
          updated?: number
        }
        Relationships: []
      }
      x_tweets: {
        Row: {
          author_avatar_url: string | null
          author_name: string | null
          author_username: string | null
          bookmark_count: number
          fetched_at: string
          is_blue_verified: boolean
          like_count: number
          not_found: boolean
          posted_at: string | null
          quote_count: number
          reply_count: number
          retweet_count: number
          text: string | null
          tweet_id: string
          verified_type: string | null
          view_count: number
        }
        Insert: {
          author_avatar_url?: string | null
          author_name?: string | null
          author_username?: string | null
          bookmark_count?: number
          fetched_at?: string
          is_blue_verified?: boolean
          like_count?: number
          not_found?: boolean
          posted_at?: string | null
          quote_count?: number
          reply_count?: number
          retweet_count?: number
          text?: string | null
          tweet_id: string
          verified_type?: string | null
          view_count?: number
        }
        Update: {
          author_avatar_url?: string | null
          author_name?: string | null
          author_username?: string | null
          bookmark_count?: number
          fetched_at?: string
          is_blue_verified?: boolean
          like_count?: number
          not_found?: boolean
          posted_at?: string | null
          quote_count?: number
          reply_count?: number
          retweet_count?: number
          text?: string | null
          tweet_id?: string
          verified_type?: string | null
          view_count?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_balance: {
        Args: {
          _amount: number
          _mode: string
          _reason: string
          _user_id: string
        }
        Returns: number
      }
      admin_set_maintenance: {
        Args: {
          _enabled: boolean
          _eta: string
          _message_en: string
          _message_ru: string
        }
        Returns: {
          enabled: boolean
          eta: string | null
          message_en: string
          message_ru: string
          singleton: boolean
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "maintenance_state"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_target_add: {
        Args: { _note: string; _user_id: string }
        Returns: {
          added_at: string
          added_by: string | null
          note: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "maintenance_targets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_target_remove: { Args: { _user_id: string }; Returns: boolean }
      admin_whitelist_add: {
        Args: { _note: string; _user_id: string }
        Returns: {
          added_at: string
          added_by: string | null
          note: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "maintenance_whitelist"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_whitelist_remove: { Args: { _user_id: string }; Returns: boolean }
      bootstrap_admin_if_none: { Args: never; Returns: boolean }
      credit_topup: { Args: { _topup_id: string }; Returns: number }
      ensure_profile: {
        Args: never
        Returns: {
          avatar_url: string | null
          balance: number
          blocked: boolean
          created_at: string
          display_name: string | null
          id: string
          language: string
          last_seen_at: string | null
          telegram_id: string | null
          telegram_username: string | null
          updated_at: string
          username: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_bot_accessible: { Args: { _user_id: string }; Returns: boolean }
      place_order: {
        Args: { _amount: number; _meta?: Json; _qty?: number; _title: string }
        Returns: Json
      }
      redeem_promo: { Args: { _code: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "user"
      order_status:
        | "pending"
        | "in_progress"
        | "waiting"
        | "completed"
        | "declined"
        | "refunded"
      supplier_status: "new" | "reviewing" | "approved" | "declined"
      topup_status: "pending" | "success" | "declined" | "expired"
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
      app_role: ["admin", "user"],
      order_status: [
        "pending",
        "in_progress",
        "waiting",
        "completed",
        "declined",
        "refunded",
      ],
      supplier_status: ["new", "reviewing", "approved", "declined"],
      topup_status: ["pending", "success", "declined", "expired"],
    },
  },
} as const
