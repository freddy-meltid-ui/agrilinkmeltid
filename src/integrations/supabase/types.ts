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
      atlas_feedback: {
        Row: {
          actor_type: string | null
          comment: string | null
          created_at: string
          crop_id: string | null
          feedback_type: string
          id: string
          region_id: string | null
          user_id: string
        }
        Insert: {
          actor_type?: string | null
          comment?: string | null
          created_at?: string
          crop_id?: string | null
          feedback_type: string
          id?: string
          region_id?: string | null
          user_id: string
        }
        Update: {
          actor_type?: string | null
          comment?: string | null
          created_at?: string
          crop_id?: string | null
          feedback_type?: string
          id?: string
          region_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atlas_feedback_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crop_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atlas_feedback_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          created_at: string
          id: string
          name_en: string
          name_fr: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name_en: string
          name_fr: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name_en?: string
          name_fr?: string
        }
        Relationships: []
      }
      crop_prices: {
        Row: {
          city: string | null
          country: string
          created_at: string
          crop_name: string
          currency: string
          id: string
          market_name: string
          price: number
          recorded_at: string
          source: string | null
          unit: string
        }
        Insert: {
          city?: string | null
          country: string
          created_at?: string
          crop_name: string
          currency?: string
          id?: string
          market_name: string
          price: number
          recorded_at?: string
          source?: string | null
          unit?: string
        }
        Update: {
          city?: string | null
          country?: string
          created_at?: string
          crop_name?: string
          currency?: string
          id?: string
          market_name?: string
          price?: number
          recorded_at?: string
          source?: string | null
          unit?: string
        }
        Relationships: []
      }
      crop_profiles: {
        Row: {
          created_at: string
          crop_name: string
          cycle_days: number | null
          id: string
          name_fr: string
          preferred_soil: string[] | null
          risk_factors: string[] | null
          water_need_mm_max: number | null
          water_need_mm_min: number | null
        }
        Insert: {
          created_at?: string
          crop_name: string
          cycle_days?: number | null
          id?: string
          name_fr: string
          preferred_soil?: string[] | null
          risk_factors?: string[] | null
          water_need_mm_max?: number | null
          water_need_mm_min?: number | null
        }
        Update: {
          created_at?: string
          crop_name?: string
          cycle_days?: number | null
          id?: string
          name_fr?: string
          preferred_soil?: string[] | null
          risk_factors?: string[] | null
          water_need_mm_max?: number | null
          water_need_mm_min?: number | null
        }
        Relationships: []
      }
      crop_recommendations: {
        Row: {
          constraints: string[] | null
          created_at: string
          crop_id: string
          id: string
          recommendation_text: string | null
          region_id: string
          suitability: string
        }
        Insert: {
          constraints?: string[] | null
          created_at?: string
          crop_id: string
          id?: string
          recommendation_text?: string | null
          region_id: string
          suitability: string
        }
        Update: {
          constraints?: string[] | null
          created_at?: string
          crop_id?: string
          id?: string
          recommendation_text?: string | null
          region_id?: string
          suitability?: string
        }
        Relationships: [
          {
            foreignKeyName: "crop_recommendations_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crop_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crop_recommendations_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_signals: {
        Row: {
          buyer_count: number
          city: string | null
          country: string
          created_at: string
          crop_name: string
          demand_level: string
          id: string
          listing_count: number
          recorded_at: string
        }
        Insert: {
          buyer_count?: number
          city?: string | null
          country: string
          created_at?: string
          crop_name: string
          demand_level?: string
          id?: string
          listing_count?: number
          recorded_at?: string
        }
        Update: {
          buyer_count?: number
          city?: string | null
          country?: string
          created_at?: string
          crop_name?: string
          demand_level?: string
          id?: string
          listing_count?: number
          recorded_at?: string
        }
        Relationships: []
      }
      farmer_interests: {
        Row: {
          created_at: string
          crop_id: string | null
          farm_size_ha: number | null
          id: string
          interest_type: string
          notes: string | null
          phone_number: string | null
          region_id: string | null
          synced_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          crop_id?: string | null
          farm_size_ha?: number | null
          id?: string
          interest_type: string
          notes?: string | null
          phone_number?: string | null
          region_id?: string | null
          synced_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          crop_id?: string | null
          farm_size_ha?: number | null
          id?: string
          interest_type?: string
          notes?: string | null
          phone_number?: string | null
          region_id?: string | null
          synced_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "farmer_interests_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crop_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_interests_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      field_sessions: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          region_id: string | null
          session_type: string
          status: string
          synced_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          region_id?: string | null
          session_type: string
          status?: string
          synced_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          region_id?: string | null
          session_type?: string
          status?: string
          synced_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_sessions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_premium: boolean
          location: string | null
          metadata: Json | null
          premium_until: string | null
          price: number | null
          price_unit: string | null
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          type: Database["public"]["Enums"]["listing_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_premium?: boolean
          location?: string | null
          metadata?: Json | null
          premium_until?: string | null
          price?: number | null
          price_unit?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          type: Database["public"]["Enums"]["listing_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_premium?: boolean
          location?: string | null
          metadata?: Json | null
          premium_until?: string | null
          price?: number | null
          price_unit?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          type?: Database["public"]["Enums"]["listing_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          listing_id: string | null
          read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          listing_id?: string | null
          read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          listing_id?: string | null
          read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string
          currency: string | null
          full_name: string | null
          id: string
          is_verified: boolean
          location: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          full_name?: string | null
          id?: string
          is_verified?: boolean
          location?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          full_name?: string | null
          id?: string
          is_verified?: boolean
          location?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rainfall_profiles: {
        Row: {
          annual_avg_mm: number | null
          confidence: string | null
          created_at: string
          dry_months: string[] | null
          id: string
          monthly_avg_json: Json | null
          rainy_season_end: string | null
          rainy_season_start: string | null
          region_id: string
          source: string | null
        }
        Insert: {
          annual_avg_mm?: number | null
          confidence?: string | null
          created_at?: string
          dry_months?: string[] | null
          id?: string
          monthly_avg_json?: Json | null
          rainy_season_end?: string | null
          rainy_season_start?: string | null
          region_id: string
          source?: string | null
        }
        Update: {
          annual_avg_mm?: number | null
          confidence?: string | null
          created_at?: string
          dry_months?: string[] | null
          id?: string
          monthly_avg_json?: Json | null
          rainy_season_end?: string | null
          rainy_season_start?: string | null
          region_id?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rainfall_profiles_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_scores: {
        Row: {
          confidence: string | null
          created_at: string
          crop_id: string
          explanation_json: Json | null
          final_score: number | null
          id: string
          market_score: number | null
          rainfall_score: number | null
          region_id: string
          risk_score: number | null
          seasonality_score: number | null
          soil_score: number | null
          source_version: string | null
          updated_at: string
          yield_score: number | null
        }
        Insert: {
          confidence?: string | null
          created_at?: string
          crop_id: string
          explanation_json?: Json | null
          final_score?: number | null
          id?: string
          market_score?: number | null
          rainfall_score?: number | null
          region_id: string
          risk_score?: number | null
          seasonality_score?: number | null
          soil_score?: number | null
          source_version?: string | null
          updated_at?: string
          yield_score?: number | null
        }
        Update: {
          confidence?: string | null
          created_at?: string
          crop_id?: string
          explanation_json?: Json | null
          final_score?: number | null
          id?: string
          market_score?: number | null
          rainfall_score?: number | null
          region_id?: string
          risk_score?: number | null
          seasonality_score?: number | null
          soil_score?: number | null
          source_version?: string | null
          updated_at?: string
          yield_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_scores_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crop_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_scores_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          agroecological_zone: string | null
          centroid_lat: number | null
          centroid_lng: number | null
          country_id: string
          created_at: string
          dominant_soil_type: string | null
          geojson: Json | null
          id: string
          irrigation_potential: string | null
          main_constraints: string[] | null
          name: string
          rainfall_max_mm: number | null
          rainfall_min_mm: number | null
          soil_fertility_level: string | null
        }
        Insert: {
          agroecological_zone?: string | null
          centroid_lat?: number | null
          centroid_lng?: number | null
          country_id: string
          created_at?: string
          dominant_soil_type?: string | null
          geojson?: Json | null
          id?: string
          irrigation_potential?: string | null
          main_constraints?: string[] | null
          name: string
          rainfall_max_mm?: number | null
          rainfall_min_mm?: number | null
          soil_fertility_level?: string | null
        }
        Update: {
          agroecological_zone?: string | null
          centroid_lat?: number | null
          centroid_lng?: number | null
          country_id?: string
          created_at?: string
          dominant_soil_type?: string | null
          geojson?: Json | null
          id?: string
          irrigation_potential?: string | null
          main_constraints?: string[] | null
          name?: string
          rainfall_max_mm?: number | null
          rainfall_min_mm?: number | null
          soil_fertility_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regions_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          listing_id: string | null
          rating: number
          reviewed_id: string
          reviewer_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          rating: number
          reviewed_id: string
          reviewer_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          rating?: number
          reviewed_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_recommendations: {
        Row: {
          created_at: string
          crop_id: string
          id: string
          region_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          crop_id: string
          id?: string
          region_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          crop_id?: string
          id?: string
          region_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_recommendations_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crop_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_recommendations_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      seasonality_profiles: {
        Row: {
          created_at: string
          crop_id: string
          harvest_window_end: string | null
          harvest_window_start: string | null
          id: string
          notes: string | null
          planting_window_end: string | null
          planting_window_start: string | null
          region_id: string
          season_fit_score: number | null
          source: string | null
        }
        Insert: {
          created_at?: string
          crop_id: string
          harvest_window_end?: string | null
          harvest_window_start?: string | null
          id?: string
          notes?: string | null
          planting_window_end?: string | null
          planting_window_start?: string | null
          region_id: string
          season_fit_score?: number | null
          source?: string | null
        }
        Update: {
          created_at?: string
          crop_id?: string
          harvest_window_end?: string | null
          harvest_window_start?: string | null
          id?: string
          notes?: string | null
          planting_window_end?: string | null
          planting_window_start?: string | null
          region_id?: string
          season_fit_score?: number | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seasonality_profiles_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crop_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasonality_profiles_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      soil_profiles: {
        Row: {
          created_at: string
          description: string | null
          fertility_notes: string | null
          id: string
          ph_range: string | null
          soil_type: string
          texture: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          fertility_notes?: string | null
          id?: string
          ph_range?: string | null
          soil_type: string
          texture?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          fertility_notes?: string | null
          id?: string
          ph_range?: string | null
          soil_type?: string
          texture?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          buyer_id: string
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          listing_id: string | null
          seller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          listing_id?: string | null
          seller_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          listing_id?: string | null
          seller_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
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
      v2_business_documents: {
        Row: {
          created_at: string
          document_type: string | null
          entity_id: string
          entity_type: string
          file_name: string | null
          id: string
          organization_id: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_type?: string | null
          entity_id: string
          entity_type: string
          file_name?: string | null
          id?: string
          organization_id: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string | null
          entity_id?: string
          entity_type?: string
          file_name?: string | null
          id?: string
          organization_id?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "v2_business_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_cash_accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["v2_cash_account_type"]
          created_at: string
          currency: string
          id: string
          is_active: boolean
          name: string
          opening_balance: number | null
          opening_date: string | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["v2_cash_account_type"]
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          name: string
          opening_balance?: number | null
          opening_date?: string | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["v2_cash_account_type"]
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          name?: string
          opening_balance?: number | null
          opening_date?: string | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_cash_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_cash_movements: {
        Row: {
          amount: number
          cash_account_id: string | null
          created_at: string
          currency: string
          description: string | null
          event_type: Database["public"]["Enums"]["v2_cash_event_type"]
          id: string
          movement_date: string
          organization_id: string
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          amount: number
          cash_account_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          event_type: Database["public"]["Enums"]["v2_cash_event_type"]
          id?: string
          movement_date?: string
          organization_id: string
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          amount?: number
          cash_account_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          event_type?: Database["public"]["Enums"]["v2_cash_event_type"]
          id?: string
          movement_date?: string
          organization_id?: string
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "v2_cash_movements_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "v2_cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_cash_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_compliance_actions: {
        Row: {
          completed_at: string | null
          completion_evidence_id: string | null
          completion_note: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          finding_id: string
          id: string
          organization_id: string
          priority: Database["public"]["Enums"]["v2_compliance_severity"]
          responsible_name: string | null
          responsible_user_id: string | null
          status: Database["public"]["Enums"]["v2_action_status"]
          title: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          completed_at?: string | null
          completion_evidence_id?: string | null
          completion_note?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          finding_id: string
          id?: string
          organization_id: string
          priority?: Database["public"]["Enums"]["v2_compliance_severity"]
          responsible_name?: string | null
          responsible_user_id?: string | null
          status?: Database["public"]["Enums"]["v2_action_status"]
          title: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          completed_at?: string | null
          completion_evidence_id?: string | null
          completion_note?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          finding_id?: string
          id?: string
          organization_id?: string
          priority?: Database["public"]["Enums"]["v2_compliance_severity"]
          responsible_name?: string | null
          responsible_user_id?: string | null
          status?: Database["public"]["Enums"]["v2_action_status"]
          title?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "v2_compliance_actions_completion_evidence_id_fkey"
            columns: ["completion_evidence_id"]
            isOneToOne: false
            referencedRelation: "v2_compliance_evidence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_compliance_actions_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "v2_compliance_findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_compliance_actions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_compliance_assessments: {
        Row: {
          assessed_at: string
          assessed_by: string
          comment: string | null
          confidence: string | null
          created_at: string
          facility_id: string | null
          id: string
          is_current: boolean
          is_demo: boolean
          org_program_id: string
          organization_id: string
          requirement_id: string
          response: Database["public"]["Enums"]["v2_assessment_response"]
        }
        Insert: {
          assessed_at?: string
          assessed_by?: string
          comment?: string | null
          confidence?: string | null
          created_at?: string
          facility_id?: string | null
          id?: string
          is_current?: boolean
          is_demo?: boolean
          org_program_id: string
          organization_id: string
          requirement_id: string
          response: Database["public"]["Enums"]["v2_assessment_response"]
        }
        Update: {
          assessed_at?: string
          assessed_by?: string
          comment?: string | null
          confidence?: string | null
          created_at?: string
          facility_id?: string | null
          id?: string
          is_current?: boolean
          is_demo?: boolean
          org_program_id?: string
          organization_id?: string
          requirement_id?: string
          response?: Database["public"]["Enums"]["v2_assessment_response"]
        }
        Relationships: [
          {
            foreignKeyName: "v2_compliance_assessments_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "v2_processing_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_compliance_assessments_org_program_id_fkey"
            columns: ["org_program_id"]
            isOneToOne: false
            referencedRelation: "v2_org_compliance_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_compliance_assessments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_compliance_assessments_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "v2_compliance_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_compliance_document_versions: {
        Row: {
          document_id: string
          expiry_date: string | null
          file_name: string | null
          id: string
          is_current: boolean
          issue_date: string | null
          notes: string | null
          organization_id: string
          storage_path: string | null
          uploaded_at: string
          uploaded_by: string
          version_number: number
        }
        Insert: {
          document_id: string
          expiry_date?: string | null
          file_name?: string | null
          id?: string
          is_current?: boolean
          issue_date?: string | null
          notes?: string | null
          organization_id: string
          storage_path?: string | null
          uploaded_at?: string
          uploaded_by?: string
          version_number: number
        }
        Update: {
          document_id?: string
          expiry_date?: string | null
          file_name?: string | null
          id?: string
          is_current?: boolean
          issue_date?: string | null
          notes?: string | null
          organization_id?: string
          storage_path?: string | null
          uploaded_at?: string
          uploaded_by?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "v2_compliance_document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v2_compliance_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_compliance_document_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_compliance_documents: {
        Row: {
          category: Database["public"]["Enums"]["v2_document_category"]
          created_at: string
          created_by: string
          current_version: number
          description: string | null
          facility_id: string | null
          id: string
          is_archived: boolean
          is_demo: boolean
          organization_id: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["v2_document_category"]
          created_at?: string
          created_by?: string
          current_version?: number
          description?: string | null
          facility_id?: string | null
          id?: string
          is_archived?: boolean
          is_demo?: boolean
          organization_id: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["v2_document_category"]
          created_at?: string
          created_by?: string
          current_version?: number
          description?: string | null
          facility_id?: string | null
          id?: string
          is_archived?: boolean
          is_demo?: boolean
          organization_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_compliance_documents_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "v2_processing_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_compliance_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_compliance_events: {
        Row: {
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          event_type: string
          id: string
          organization_id: string
          payload: Json
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          event_type: string
          id?: string
          organization_id: string
          payload?: Json
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          event_type?: string
          id?: string
          organization_id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "v2_compliance_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_compliance_evidence: {
        Row: {
          assessment_id: string | null
          created_at: string
          description: string | null
          evidence_type: Database["public"]["Enums"]["v2_evidence_type"]
          expiry_date: string | null
          external_reference: string | null
          facility_id: string | null
          id: string
          is_archived: boolean
          is_demo: boolean
          issue_date: string | null
          org_program_id: string | null
          organization_id: string
          related_entity_id: string | null
          related_entity_reference: string | null
          related_entity_type: string | null
          requirement_id: string | null
          source: Database["public"]["Enums"]["v2_evidence_source"]
          storage_path: string | null
          title: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string
          verification_status: string
        }
        Insert: {
          assessment_id?: string | null
          created_at?: string
          description?: string | null
          evidence_type?: Database["public"]["Enums"]["v2_evidence_type"]
          expiry_date?: string | null
          external_reference?: string | null
          facility_id?: string | null
          id?: string
          is_archived?: boolean
          is_demo?: boolean
          issue_date?: string | null
          org_program_id?: string | null
          organization_id: string
          related_entity_id?: string | null
          related_entity_reference?: string | null
          related_entity_type?: string | null
          requirement_id?: string | null
          source?: Database["public"]["Enums"]["v2_evidence_source"]
          storage_path?: string | null
          title: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string
          verification_status?: string
        }
        Update: {
          assessment_id?: string | null
          created_at?: string
          description?: string | null
          evidence_type?: Database["public"]["Enums"]["v2_evidence_type"]
          expiry_date?: string | null
          external_reference?: string | null
          facility_id?: string | null
          id?: string
          is_archived?: boolean
          is_demo?: boolean
          issue_date?: string | null
          org_program_id?: string | null
          organization_id?: string
          related_entity_id?: string | null
          related_entity_reference?: string | null
          related_entity_type?: string | null
          requirement_id?: string | null
          source?: Database["public"]["Enums"]["v2_evidence_source"]
          storage_path?: string | null
          title?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_compliance_evidence_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "v2_compliance_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_compliance_evidence_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "v2_processing_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_compliance_evidence_org_program_id_fkey"
            columns: ["org_program_id"]
            isOneToOne: false
            referencedRelation: "v2_org_compliance_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_compliance_evidence_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_compliance_evidence_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "v2_compliance_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_compliance_evidence_analyses: {
        Row: {
          analysis_version: string
          confidence: number | null
          created_at: string
          evidence_id: string
          findings: Json
          human_validated: boolean
          id: string
          model: string | null
          organization_id: string
          requirement_id: string | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          analysis_version: string
          confidence?: number | null
          created_at?: string
          evidence_id: string
          findings?: Json
          human_validated?: boolean
          id?: string
          model?: string | null
          organization_id: string
          requirement_id?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          analysis_version?: string
          confidence?: number | null
          created_at?: string
          evidence_id?: string
          findings?: Json
          human_validated?: boolean
          id?: string
          model?: string | null
          organization_id?: string
          requirement_id?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "v2_compliance_evidence_analyses_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "v2_compliance_evidence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_compliance_evidence_analyses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_compliance_evidence_analyses_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "v2_compliance_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_compliance_findings: {
        Row: {
          assessment_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          facility_id: string | null
          id: string
          org_program_id: string | null
          organization_id: string
          requirement_id: string | null
          resolved_at: string | null
          severity: Database["public"]["Enums"]["v2_compliance_severity"]
          status: Database["public"]["Enums"]["v2_finding_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assessment_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          facility_id?: string | null
          id?: string
          org_program_id?: string | null
          organization_id: string
          requirement_id?: string | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["v2_compliance_severity"]
          status?: Database["public"]["Enums"]["v2_finding_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          facility_id?: string | null
          id?: string
          org_program_id?: string | null
          organization_id?: string
          requirement_id?: string | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["v2_compliance_severity"]
          status?: Database["public"]["Enums"]["v2_finding_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_compliance_findings_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "v2_compliance_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_compliance_findings_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "v2_processing_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_compliance_findings_org_program_id_fkey"
            columns: ["org_program_id"]
            isOneToOne: false
            referencedRelation: "v2_org_compliance_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_compliance_findings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_compliance_findings_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "v2_compliance_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_compliance_programs: {
        Row: {
          code: string
          country: string
          created_at: string
          description_en: string | null
          description_fr: string | null
          disclaimer_en: string
          disclaimer_fr: string
          effective_date: string
          id: string
          is_active: boolean
          managed_by: string
          name_en: string
          name_fr: string
          product_applicability: string | null
          sort_order: number
          source_reference: string | null
          updated_at: string
          value_chain_id: string | null
          version: string
        }
        Insert: {
          code: string
          country?: string
          created_at?: string
          description_en?: string | null
          description_fr?: string | null
          disclaimer_en: string
          disclaimer_fr: string
          effective_date?: string
          id?: string
          is_active?: boolean
          managed_by?: string
          name_en: string
          name_fr: string
          product_applicability?: string | null
          sort_order?: number
          source_reference?: string | null
          updated_at?: string
          value_chain_id?: string | null
          version?: string
        }
        Update: {
          code?: string
          country?: string
          created_at?: string
          description_en?: string | null
          description_fr?: string | null
          disclaimer_en?: string
          disclaimer_fr?: string
          effective_date?: string
          id?: string
          is_active?: boolean
          managed_by?: string
          name_en?: string
          name_fr?: string
          product_applicability?: string | null
          sort_order?: number
          source_reference?: string | null
          updated_at?: string
          value_chain_id?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_compliance_programs_value_chain_id_fkey"
            columns: ["value_chain_id"]
            isOneToOne: false
            referencedRelation: "v2_value_chains"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_compliance_requirements: {
        Row: {
          applicability_rule: Json
          category: Database["public"]["Enums"]["v2_compliance_category"]
          code: string
          created_at: string
          description_en: string | null
          description_fr: string | null
          evidence_expected_en: string | null
          evidence_expected_fr: string | null
          guidance_en: string | null
          guidance_fr: string | null
          id: string
          is_active: boolean
          program_id: string
          requirement_type: Database["public"]["Enums"]["v2_requirement_type"]
          scope: Database["public"]["Enums"]["v2_compliance_scope"]
          severity: Database["public"]["Enums"]["v2_compliance_severity"]
          sort_order: number
          system_evidence_rule: string | null
          title_en: string
          title_fr: string
          updated_at: string
        }
        Insert: {
          applicability_rule?: Json
          category?: Database["public"]["Enums"]["v2_compliance_category"]
          code: string
          created_at?: string
          description_en?: string | null
          description_fr?: string | null
          evidence_expected_en?: string | null
          evidence_expected_fr?: string | null
          guidance_en?: string | null
          guidance_fr?: string | null
          id?: string
          is_active?: boolean
          program_id: string
          requirement_type?: Database["public"]["Enums"]["v2_requirement_type"]
          scope?: Database["public"]["Enums"]["v2_compliance_scope"]
          severity?: Database["public"]["Enums"]["v2_compliance_severity"]
          sort_order?: number
          system_evidence_rule?: string | null
          title_en: string
          title_fr: string
          updated_at?: string
        }
        Update: {
          applicability_rule?: Json
          category?: Database["public"]["Enums"]["v2_compliance_category"]
          code?: string
          created_at?: string
          description_en?: string | null
          description_fr?: string | null
          evidence_expected_en?: string | null
          evidence_expected_fr?: string | null
          guidance_en?: string | null
          guidance_fr?: string | null
          id?: string
          is_active?: boolean
          program_id?: string
          requirement_type?: Database["public"]["Enums"]["v2_requirement_type"]
          scope?: Database["public"]["Enums"]["v2_compliance_scope"]
          severity?: Database["public"]["Enums"]["v2_compliance_severity"]
          sort_order?: number
          system_evidence_rule?: string | null
          title_en?: string
          title_fr?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_compliance_requirements_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v2_compliance_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_compliance_settings: {
        Row: {
          created_at: string
          expiring_soon_days: number
          organization_id: string
          updated_at: string
          weight_critical: number
          weight_high: number
          weight_low: number
          weight_medium: number
        }
        Insert: {
          created_at?: string
          expiring_soon_days?: number
          organization_id: string
          updated_at?: string
          weight_critical?: number
          weight_high?: number
          weight_low?: number
          weight_medium?: number
        }
        Update: {
          created_at?: string
          expiring_soon_days?: number
          organization_id?: string
          updated_at?: string
          weight_critical?: number
          weight_high?: number
          weight_low?: number
          weight_medium?: number
        }
        Relationships: [
          {
            foreignKeyName: "v2_compliance_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_crop_cycles: {
        Row: {
          area_unit: string
          client_ref: string | null
          created_at: string
          created_by: string
          crop_id: string
          cultivated_area: number | null
          estimated_yield: number | null
          expected_harvest_end: string | null
          expected_harvest_start: string | null
          id: string
          notes: string | null
          parcel_id: string
          planting_date: string | null
          production_practice: string | null
          status: Database["public"]["Enums"]["v2_crop_cycle_status"]
          supplier_id: string
          updated_at: string
          variety_id: string | null
          yield_unit: string
        }
        Insert: {
          area_unit?: string
          client_ref?: string | null
          created_at?: string
          created_by?: string
          crop_id: string
          cultivated_area?: number | null
          estimated_yield?: number | null
          expected_harvest_end?: string | null
          expected_harvest_start?: string | null
          id?: string
          notes?: string | null
          parcel_id: string
          planting_date?: string | null
          production_practice?: string | null
          status?: Database["public"]["Enums"]["v2_crop_cycle_status"]
          supplier_id: string
          updated_at?: string
          variety_id?: string | null
          yield_unit?: string
        }
        Update: {
          area_unit?: string
          client_ref?: string | null
          created_at?: string
          created_by?: string
          crop_id?: string
          cultivated_area?: number | null
          estimated_yield?: number | null
          expected_harvest_end?: string | null
          expected_harvest_start?: string | null
          id?: string
          notes?: string | null
          parcel_id?: string
          planting_date?: string | null
          production_practice?: string | null
          status?: Database["public"]["Enums"]["v2_crop_cycle_status"]
          supplier_id?: string
          updated_at?: string
          variety_id?: string | null
          yield_unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_crop_cycles_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "v2_crops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_crop_cycles_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "v2_farm_parcels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_crop_cycles_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v2_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_crop_cycles_variety_id_fkey"
            columns: ["variety_id"]
            isOneToOne: false
            referencedRelation: "v2_crop_varieties"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_crop_varieties: {
        Row: {
          code: string
          created_at: string
          crop_id: string
          id: string
          is_active: boolean
          name_en: string
          name_fr: string
          notes: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          crop_id: string
          id?: string
          is_active?: boolean
          name_en: string
          name_fr: string
          notes?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          crop_id?: string
          id?: string
          is_active?: boolean
          name_en?: string
          name_fr?: string
          notes?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_crop_varieties_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "v2_crops"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_crops: {
        Row: {
          code: string
          created_at: string
          default_unit_code: string | null
          id: string
          is_active: boolean
          name_en: string
          name_fr: string
          sort_order: number
          updated_at: string
          value_chain_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          default_unit_code?: string | null
          id?: string
          is_active?: boolean
          name_en: string
          name_fr: string
          sort_order?: number
          updated_at?: string
          value_chain_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          default_unit_code?: string | null
          id?: string
          is_active?: boolean
          name_en?: string
          name_fr?: string
          sort_order?: number
          updated_at?: string
          value_chain_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "v2_crops_value_chain_id_fkey"
            columns: ["value_chain_id"]
            isOneToOne: false
            referencedRelation: "v2_value_chains"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_customer_payments: {
        Row: {
          amount: number
          cash_account_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_id: string
          document_path: string | null
          id: string
          is_reversal: boolean
          notes: string | null
          organization_id: string
          payment_date: string
          payment_method: Database["public"]["Enums"]["v2_payment_method"]
          payment_reference: string | null
          reversal_reason: string | null
          reversed_at: string | null
          reverses_payment_id: string | null
          sales_order_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          cash_account_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id: string
          document_path?: string | null
          id?: string
          is_reversal?: boolean
          notes?: string | null
          organization_id: string
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["v2_payment_method"]
          payment_reference?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          reverses_payment_id?: string | null
          sales_order_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          cash_account_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string
          document_path?: string | null
          id?: string
          is_reversal?: boolean
          notes?: string | null
          organization_id?: string
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["v2_payment_method"]
          payment_reference?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          reverses_payment_id?: string | null
          sales_order_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_customer_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v2_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_customer_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_customer_payments_reverses_payment_id_fkey"
            columns: ["reverses_payment_id"]
            isOneToOne: false
            referencedRelation: "v2_customer_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_customer_payments_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "v2_sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_customers: {
        Row: {
          address: string | null
          commune: string | null
          contact_person: string | null
          country: string
          created_at: string
          created_by: string | null
          customer_code: string
          customer_type: Database["public"]["Enums"]["v2_customer_type"]
          department: string | null
          display_name: string
          email: string | null
          id: string
          is_active: boolean
          legal_name: string | null
          notes: string | null
          organization_id: string
          phone: string | null
          tax_reference: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          commune?: string | null
          contact_person?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          customer_code: string
          customer_type?: Database["public"]["Enums"]["v2_customer_type"]
          department?: string | null
          display_name: string
          email?: string | null
          id?: string
          is_active?: boolean
          legal_name?: string | null
          notes?: string | null
          organization_id: string
          phone?: string | null
          tax_reference?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          commune?: string | null
          contact_person?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          customer_code?: string
          customer_type?: Database["public"]["Enums"]["v2_customer_type"]
          department?: string | null
          display_name?: string
          email?: string | null
          id?: string
          is_active?: boolean
          legal_name?: string | null
          notes?: string | null
          organization_id?: string
          phone?: string | null
          tax_reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_deliveries: {
        Row: {
          actual_arrival_date: string | null
          created_at: string
          created_by: string
          declared_quantity: number | null
          facility_id: string | null
          id: string
          notes: string | null
          order_id: string
          organization_id: string
          received_quantity: number | null
          reference: string
          scheduled_date: string | null
          status: Database["public"]["Enums"]["v2_delivery_status"]
          supplier_id: string
          unit_code: string
          updated_at: string
        }
        Insert: {
          actual_arrival_date?: string | null
          created_at?: string
          created_by: string
          declared_quantity?: number | null
          facility_id?: string | null
          id?: string
          notes?: string | null
          order_id: string
          organization_id: string
          received_quantity?: number | null
          reference: string
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["v2_delivery_status"]
          supplier_id: string
          unit_code?: string
          updated_at?: string
        }
        Update: {
          actual_arrival_date?: string | null
          created_at?: string
          created_by?: string
          declared_quantity?: number | null
          facility_id?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          organization_id?: string
          received_quantity?: number | null
          reference?: string
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["v2_delivery_status"]
          supplier_id?: string
          unit_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_deliveries_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "v2_processing_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v2_procurement_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_deliveries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_deliveries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v2_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_expenses: {
        Row: {
          amount: number
          cash_account_id: string | null
          category: Database["public"]["Enums"]["v2_expense_category"]
          created_at: string
          created_by: string | null
          currency: string
          description: string
          document_path: string | null
          expense_date: string
          facility_id: string | null
          id: string
          notes: string | null
          organization_id: string
          payee: string | null
          payment_date: string | null
          payment_method:
            | Database["public"]["Enums"]["v2_payment_method"]
            | null
          payment_status: Database["public"]["Enums"]["v2_expense_payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          cash_account_id?: string | null
          category?: Database["public"]["Enums"]["v2_expense_category"]
          created_at?: string
          created_by?: string | null
          currency?: string
          description: string
          document_path?: string | null
          expense_date?: string
          facility_id?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          payee?: string | null
          payment_date?: string | null
          payment_method?:
            | Database["public"]["Enums"]["v2_payment_method"]
            | null
          payment_status?: Database["public"]["Enums"]["v2_expense_payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          cash_account_id?: string | null
          category?: Database["public"]["Enums"]["v2_expense_category"]
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string
          document_path?: string | null
          expense_date?: string
          facility_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          payee?: string | null
          payment_date?: string | null
          payment_method?:
            | Database["public"]["Enums"]["v2_payment_method"]
            | null
          payment_status?: Database["public"]["Enums"]["v2_expense_payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_expenses_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "v2_processing_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_farm_parcels: {
        Row: {
          area: number | null
          area_unit: string
          boundary_geojson: Json | null
          client_ref: string | null
          created_at: string
          created_by: string
          farm_id: string
          id: string
          irrigation_status: string | null
          is_active: boolean
          latitude: number | null
          longitude: number | null
          notes: string | null
          reference: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          area?: number | null
          area_unit?: string
          boundary_geojson?: Json | null
          client_ref?: string | null
          created_at?: string
          created_by?: string
          farm_id: string
          id?: string
          irrigation_status?: string | null
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          reference: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          area?: number | null
          area_unit?: string
          boundary_geojson?: Json | null
          client_ref?: string | null
          created_at?: string
          created_by?: string
          farm_id?: string
          id?: string
          irrigation_status?: string | null
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          reference?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_farm_parcels_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "v2_farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_farm_parcels_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v2_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_farms: {
        Row: {
          accessibility_notes: string | null
          area_unit: string
          arrondissement: string | null
          client_ref: string | null
          commune: string | null
          country: string
          created_at: string
          created_by: string
          department: string | null
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          supplier_id: string
          total_area: number | null
          updated_at: string
          village: string | null
        }
        Insert: {
          accessibility_notes?: string | null
          area_unit?: string
          arrondissement?: string | null
          client_ref?: string | null
          commune?: string | null
          country?: string
          created_at?: string
          created_by?: string
          department?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          supplier_id: string
          total_area?: number | null
          updated_at?: string
          village?: string | null
        }
        Update: {
          accessibility_notes?: string | null
          area_unit?: string
          arrondissement?: string | null
          client_ref?: string | null
          commune?: string | null
          country?: string
          created_at?: string
          created_by?: string
          department?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          supplier_id?: string
          total_area?: number | null
          updated_at?: string
          village?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "v2_farms_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v2_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_field_agents: {
        Row: {
          assigned_areas: string[]
          country: string
          created_at: string
          created_by: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_areas?: string[]
          country?: string
          created_at?: string
          created_by?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_areas?: string[]
          country?: string
          created_at?: string
          created_by?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      v2_field_visits: {
        Row: {
          actions_performed: string[]
          client_ref: string | null
          created_at: string
          created_by: string
          farm_id: string | null
          field_agent_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          next_visit_date: string | null
          notes: string | null
          photos: Json
          supplier_id: string
          updated_at: string
          visit_date: string
          visit_type: Database["public"]["Enums"]["v2_visit_type"]
        }
        Insert: {
          actions_performed?: string[]
          client_ref?: string | null
          created_at?: string
          created_by?: string
          farm_id?: string | null
          field_agent_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          next_visit_date?: string | null
          notes?: string | null
          photos?: Json
          supplier_id: string
          updated_at?: string
          visit_date?: string
          visit_type?: Database["public"]["Enums"]["v2_visit_type"]
        }
        Update: {
          actions_performed?: string[]
          client_ref?: string | null
          created_at?: string
          created_by?: string
          farm_id?: string | null
          field_agent_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          next_visit_date?: string | null
          notes?: string | null
          photos?: Json
          supplier_id?: string
          updated_at?: string
          visit_date?: string
          visit_type?: Database["public"]["Enums"]["v2_visit_type"]
        }
        Relationships: [
          {
            foreignKeyName: "v2_field_visits_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "v2_farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_field_visits_field_agent_id_fkey"
            columns: ["field_agent_id"]
            isOneToOne: false
            referencedRelation: "v2_field_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_field_visits_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v2_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_finance_document_links: {
        Row: {
          created_at: string
          document_id: string | null
          evidence_id: string | null
          id: string
          linked_by: string | null
          note: string | null
          organization_id: string
          requirement_code: string
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          evidence_id?: string | null
          id?: string
          linked_by?: string | null
          note?: string | null
          organization_id: string
          requirement_code: string
        }
        Update: {
          created_at?: string
          document_id?: string | null
          evidence_id?: string | null
          id?: string
          linked_by?: string | null
          note?: string | null
          organization_id?: string
          requirement_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_finance_document_links_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v2_compliance_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_finance_document_links_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "v2_compliance_evidence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_finance_document_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_finance_document_links_requirement_code_fkey"
            columns: ["requirement_code"]
            isOneToOne: false
            referencedRelation: "v2_finance_document_requirements"
            referencedColumns: ["code"]
          },
        ]
      }
      v2_finance_document_requirements: {
        Row: {
          category: string
          code: string
          country: string | null
          created_at: string
          description_en: string | null
          description_fr: string | null
          id: string
          importance: string
          is_active: boolean
          name_en: string
          name_fr: string
          sort_order: number
          suggested_document_category:
            | Database["public"]["Enums"]["v2_document_category"]
            | null
        }
        Insert: {
          category: string
          code: string
          country?: string | null
          created_at?: string
          description_en?: string | null
          description_fr?: string | null
          id?: string
          importance?: string
          is_active?: boolean
          name_en: string
          name_fr: string
          sort_order?: number
          suggested_document_category?:
            | Database["public"]["Enums"]["v2_document_category"]
            | null
        }
        Update: {
          category?: string
          code?: string
          country?: string | null
          created_at?: string
          description_en?: string | null
          description_fr?: string | null
          id?: string
          importance?: string
          is_active?: boolean
          name_en?: string
          name_fr?: string
          sort_order?: number
          suggested_document_category?:
            | Database["public"]["Enums"]["v2_document_category"]
            | null
        }
        Relationships: []
      }
      v2_finance_events: {
        Row: {
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          organization_id: string
          payload: Json
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          organization_id: string
          payload?: Json
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          organization_id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "v2_finance_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_finance_profiles: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          financing_purpose:
            | Database["public"]["Enums"]["v2_financing_purpose"]
            | null
          financing_type:
            | Database["public"]["Enums"]["v2_financing_type"]
            | null
          id: string
          intended_use: string | null
          is_demo: boolean
          notes: string | null
          organization_id: string
          own_contribution: number | null
          requested_amount: number | null
          status: Database["public"]["Enums"]["v2_finance_request_status"]
          target_date: string | null
          tenor_months: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          financing_purpose?:
            | Database["public"]["Enums"]["v2_financing_purpose"]
            | null
          financing_type?:
            | Database["public"]["Enums"]["v2_financing_type"]
            | null
          id?: string
          intended_use?: string | null
          is_demo?: boolean
          notes?: string | null
          organization_id: string
          own_contribution?: number | null
          requested_amount?: number | null
          status?: Database["public"]["Enums"]["v2_finance_request_status"]
          target_date?: string | null
          tenor_months?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          financing_purpose?:
            | Database["public"]["Enums"]["v2_financing_purpose"]
            | null
          financing_type?:
            | Database["public"]["Enums"]["v2_financing_type"]
            | null
          id?: string
          intended_use?: string | null
          is_demo?: boolean
          notes?: string | null
          organization_id?: string
          own_contribution?: number | null
          requested_amount?: number | null
          status?: Database["public"]["Enums"]["v2_finance_request_status"]
          target_date?: string | null
          tenor_months?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_finance_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_finance_settings: {
        Row: {
          created_at: string
          organization_id: string
          updated_at: string
          weights: Json
        }
        Insert: {
          created_at?: string
          organization_id: string
          updated_at?: string
          weights?: Json
        }
        Update: {
          created_at?: string
          organization_id?: string
          updated_at?: string
          weights?: Json
        }
        Relationships: [
          {
            foreignKeyName: "v2_finance_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_finance_shares: {
        Row: {
          access_count: number
          created_at: string
          created_by: string | null
          expires_at: string
          finance_profile_id: string | null
          id: string
          last_accessed_at: string | null
          organization_id: string
          recipient_email: string | null
          recipient_name: string
          recipient_type: Database["public"]["Enums"]["v2_finance_recipient_type"]
          revoked_at: string | null
          revoked_by: string | null
          scopes: Database["public"]["Enums"]["v2_finance_share_scope"][]
          token_hash: string
        }
        Insert: {
          access_count?: number
          created_at?: string
          created_by?: string | null
          expires_at: string
          finance_profile_id?: string | null
          id?: string
          last_accessed_at?: string | null
          organization_id: string
          recipient_email?: string | null
          recipient_name: string
          recipient_type: Database["public"]["Enums"]["v2_finance_recipient_type"]
          revoked_at?: string | null
          revoked_by?: string | null
          scopes?: Database["public"]["Enums"]["v2_finance_share_scope"][]
          token_hash: string
        }
        Update: {
          access_count?: number
          created_at?: string
          created_by?: string | null
          expires_at?: string
          finance_profile_id?: string | null
          id?: string
          last_accessed_at?: string | null
          organization_id?: string
          recipient_email?: string | null
          recipient_name?: string
          recipient_type?: Database["public"]["Enums"]["v2_finance_recipient_type"]
          revoked_at?: string | null
          revoked_by?: string | null
          scopes?: Database["public"]["Enums"]["v2_finance_share_scope"][]
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_finance_shares_finance_profile_id_fkey"
            columns: ["finance_profile_id"]
            isOneToOne: false
            referencedRelation: "v2_finance_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_finance_shares_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_finance_use_of_funds: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["v2_financing_purpose"]
          created_at: string
          finance_profile_id: string
          id: string
          label: string | null
          notes: string | null
          organization_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          amount?: number
          category: Database["public"]["Enums"]["v2_financing_purpose"]
          created_at?: string
          finance_profile_id: string
          id?: string
          label?: string | null
          notes?: string | null
          organization_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["v2_financing_purpose"]
          created_at?: string
          finance_profile_id?: string
          id?: string
          label?: string | null
          notes?: string | null
          organization_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_finance_use_of_funds_finance_profile_id_fkey"
            columns: ["finance_profile_id"]
            isOneToOne: false
            referencedRelation: "v2_finance_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_finance_use_of_funds_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_finished_goods_movements: {
        Row: {
          created_at: string
          created_by: string | null
          facility_id: string | null
          finished_batch_id: string | null
          id: string
          movement_type: Database["public"]["Enums"]["v2_fg_movement_type"]
          notes: string | null
          organization_id: string
          product_id: string | null
          quantity: number
          reference_id: string | null
          reference_type: string | null
          unit_code: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          facility_id?: string | null
          finished_batch_id?: string | null
          id?: string
          movement_type: Database["public"]["Enums"]["v2_fg_movement_type"]
          notes?: string | null
          organization_id: string
          product_id?: string | null
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          unit_code?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          facility_id?: string | null
          finished_batch_id?: string | null
          id?: string
          movement_type?: Database["public"]["Enums"]["v2_fg_movement_type"]
          notes?: string | null
          organization_id?: string
          product_id?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          unit_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_finished_goods_movements_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "v2_processing_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_finished_goods_movements_finished_batch_id_fkey"
            columns: ["finished_batch_id"]
            isOneToOne: false
            referencedRelation: "v2_finished_product_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_finished_goods_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_finished_goods_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v2_processed_products"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_finished_product_batches: {
        Row: {
          batch_reference: string
          created_at: string
          expiry_date: string | null
          facility_id: string | null
          id: string
          organization_id: string
          product_id: string | null
          production_batch_id: string
          production_date: string
          quality_status: string
          quantity_produced: number
          status: string
          storage_location: string | null
          unit_code: string
          updated_at: string
        }
        Insert: {
          batch_reference: string
          created_at?: string
          expiry_date?: string | null
          facility_id?: string | null
          id?: string
          organization_id: string
          product_id?: string | null
          production_batch_id: string
          production_date?: string
          quality_status?: string
          quantity_produced: number
          status?: string
          storage_location?: string | null
          unit_code?: string
          updated_at?: string
        }
        Update: {
          batch_reference?: string
          created_at?: string
          expiry_date?: string | null
          facility_id?: string | null
          id?: string
          organization_id?: string
          product_id?: string | null
          production_batch_id?: string
          production_date?: string
          quality_status?: string
          quantity_produced?: number
          status?: string
          storage_location?: string | null
          unit_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_finished_product_batches_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "v2_processing_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_finished_product_batches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_finished_product_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v2_processed_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_finished_product_batches_production_batch_id_fkey"
            columns: ["production_batch_id"]
            isOneToOne: false
            referencedRelation: "v2_production_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_goods_receipts: {
        Row: {
          accepted_quantity: number
          accepted_tonnes: number
          condition_notes: string | null
          created_at: string
          delivered_quantity: number
          delivered_tonnes: number
          delivery_id: string
          facility_id: string | null
          id: string
          order_id: string
          organization_id: string
          over_delivery_accepted: boolean
          over_delivery_tonnes: number
          photos: Json
          quality_grade: string | null
          quality_result: Database["public"]["Enums"]["v2_receipt_quality"]
          received_at: string
          received_by: string
          receiving_notes: string | null
          reference: string
          rejected_quantity: number
          rejected_tonnes: number
          supplier_id: string
          unit_code: string
        }
        Insert: {
          accepted_quantity?: number
          accepted_tonnes?: number
          condition_notes?: string | null
          created_at?: string
          delivered_quantity?: number
          delivered_tonnes?: number
          delivery_id: string
          facility_id?: string | null
          id?: string
          order_id: string
          organization_id: string
          over_delivery_accepted?: boolean
          over_delivery_tonnes?: number
          photos?: Json
          quality_grade?: string | null
          quality_result?: Database["public"]["Enums"]["v2_receipt_quality"]
          received_at?: string
          received_by: string
          receiving_notes?: string | null
          reference: string
          rejected_quantity?: number
          rejected_tonnes?: number
          supplier_id: string
          unit_code?: string
        }
        Update: {
          accepted_quantity?: number
          accepted_tonnes?: number
          condition_notes?: string | null
          created_at?: string
          delivered_quantity?: number
          delivered_tonnes?: number
          delivery_id?: string
          facility_id?: string | null
          id?: string
          order_id?: string
          organization_id?: string
          over_delivery_accepted?: boolean
          over_delivery_tonnes?: number
          photos?: Json
          quality_grade?: string | null
          quality_result?: Database["public"]["Enums"]["v2_receipt_quality"]
          received_at?: string
          received_by?: string
          receiving_notes?: string | null
          reference?: string
          rejected_quantity?: number
          rejected_tonnes?: number
          supplier_id?: string
          unit_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_goods_receipts_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "v2_deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_goods_receipts_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "v2_processing_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_goods_receipts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v2_procurement_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_goods_receipts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_goods_receipts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v2_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_harvest_forecasts: {
        Row: {
          captured_by: string
          client_ref: string | null
          confidence: Database["public"]["Enums"]["v2_confidence"]
          created_at: string
          crop_cycle_id: string
          estimated_quantity: number
          expected_harvest_end: string | null
          expected_harvest_start: string | null
          field_visit_id: string | null
          forecast_date: string
          id: string
          observation: string | null
          source: string
          supplier_id: string
          unit_code: string
          updated_at: string
        }
        Insert: {
          captured_by?: string
          client_ref?: string | null
          confidence?: Database["public"]["Enums"]["v2_confidence"]
          created_at?: string
          crop_cycle_id: string
          estimated_quantity: number
          expected_harvest_end?: string | null
          expected_harvest_start?: string | null
          field_visit_id?: string | null
          forecast_date?: string
          id?: string
          observation?: string | null
          source?: string
          supplier_id: string
          unit_code?: string
          updated_at?: string
        }
        Update: {
          captured_by?: string
          client_ref?: string | null
          confidence?: Database["public"]["Enums"]["v2_confidence"]
          created_at?: string
          crop_cycle_id?: string
          estimated_quantity?: number
          expected_harvest_end?: string | null
          expected_harvest_start?: string | null
          field_visit_id?: string | null
          forecast_date?: string
          id?: string
          observation?: string | null
          source?: string
          supplier_id?: string
          unit_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_harvest_forecasts_crop_cycle_id_fkey"
            columns: ["crop_cycle_id"]
            isOneToOne: false
            referencedRelation: "v2_crop_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_harvest_forecasts_field_visit_id_fkey"
            columns: ["field_visit_id"]
            isOneToOne: false
            referencedRelation: "v2_field_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_harvest_forecasts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v2_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_inventory_movements: {
        Row: {
          batch_id: string | null
          created_at: string
          created_by: string | null
          crop_id: string | null
          facility_id: string | null
          id: string
          movement_type: Database["public"]["Enums"]["v2_inventory_movement_type"]
          notes: string | null
          organization_id: string
          quantity_tonnes: number
          reference_id: string | null
          reference_type: string | null
          variety_id: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          crop_id?: string | null
          facility_id?: string | null
          id?: string
          movement_type: Database["public"]["Enums"]["v2_inventory_movement_type"]
          notes?: string | null
          organization_id: string
          quantity_tonnes: number
          reference_id?: string | null
          reference_type?: string | null
          variety_id?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          crop_id?: string | null
          facility_id?: string | null
          id?: string
          movement_type?: Database["public"]["Enums"]["v2_inventory_movement_type"]
          notes?: string | null
          organization_id?: string
          quantity_tonnes?: number
          reference_id?: string | null
          reference_type?: string | null
          variety_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "v2_inventory_movements_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v2_raw_material_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_inventory_movements_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "v2_crops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_inventory_movements_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "v2_processing_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_inventory_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_inventory_movements_variety_id_fkey"
            columns: ["variety_id"]
            isOneToOne: false
            referencedRelation: "v2_crop_varieties"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_notification_events: {
        Row: {
          channel: string
          created_at: string
          event_type: string
          id: string
          organization_id: string | null
          payload: Json
          read_at: string | null
          recipient_user_id: string | null
          supplier_id: string | null
        }
        Insert: {
          channel?: string
          created_at?: string
          event_type: string
          id?: string
          organization_id?: string | null
          payload?: Json
          read_at?: string | null
          recipient_user_id?: string | null
          supplier_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          event_type?: string
          id?: string
          organization_id?: string | null
          payload?: Json
          read_at?: string | null
          recipient_user_id?: string | null
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "v2_notification_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_notification_events_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v2_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_org_compliance_programs: {
        Row: {
          created_at: string
          created_by: string
          facility_id: string | null
          id: string
          notes: string | null
          organization_id: string
          program_id: string
          started_at: string
          status: Database["public"]["Enums"]["v2_program_status"]
          target_audit_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          facility_id?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          program_id: string
          started_at?: string
          status?: Database["public"]["Enums"]["v2_program_status"]
          target_audit_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          facility_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          program_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["v2_program_status"]
          target_audit_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_org_compliance_programs_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "v2_processing_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_org_compliance_programs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_org_compliance_programs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v2_compliance_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_organization_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["v2_org_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["v2_org_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["v2_org_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_organizations: {
        Row: {
          city: string | null
          country: string
          created_at: string
          created_by: string
          id: string
          legal_name: string | null
          name: string
          org_type: Database["public"]["Enums"]["v2_org_type"]
          region: string | null
          status: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          country?: string
          created_at?: string
          created_by?: string
          id?: string
          legal_name?: string | null
          name: string
          org_type?: Database["public"]["Enums"]["v2_org_type"]
          region?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          country?: string
          created_at?: string
          created_by?: string
          id?: string
          legal_name?: string | null
          name?: string
          org_type?: Database["public"]["Enums"]["v2_org_type"]
          region?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      v2_processed_products: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          default_inventory_unit: string
          default_production_unit: string
          facility_id: string | null
          id: string
          is_active: boolean
          notes: string | null
          organization_id: string
          product_code: string | null
          product_name: string
          production_capacity_period: string | null
          production_capacity_unit: string | null
          production_capacity_value: number | null
          shelf_life_days: number | null
          updated_at: string
          value_chain: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string
          default_inventory_unit?: string
          default_production_unit?: string
          facility_id?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          organization_id: string
          product_code?: string | null
          product_name: string
          production_capacity_period?: string | null
          production_capacity_unit?: string | null
          production_capacity_value?: number | null
          shelf_life_days?: number | null
          updated_at?: string
          value_chain?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          default_inventory_unit?: string
          default_production_unit?: string
          facility_id?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          organization_id?: string
          product_code?: string | null
          product_name?: string
          production_capacity_period?: string | null
          production_capacity_unit?: string | null
          production_capacity_value?: number | null
          shelf_life_days?: number | null
          updated_at?: string
          value_chain?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "v2_processed_products_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "v2_processing_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_processed_products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_processing_facilities: {
        Row: {
          address: string | null
          arrondissement: string | null
          commune: string | null
          created_at: string
          created_by: string
          department: string | null
          id: string
          is_main: boolean
          latitude: number | null
          longitude: number | null
          name: string
          organization_id: string
          processing_capacity_period: string | null
          processing_capacity_unit: string | null
          processing_capacity_value: number | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          arrondissement?: string | null
          commune?: string | null
          created_at?: string
          created_by?: string
          department?: string | null
          id?: string
          is_main?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          organization_id: string
          processing_capacity_period?: string | null
          processing_capacity_unit?: string | null
          processing_capacity_value?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          arrondissement?: string | null
          commune?: string | null
          created_at?: string
          created_by?: string
          department?: string | null
          id?: string
          is_main?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          organization_id?: string
          processing_capacity_period?: string | null
          processing_capacity_unit?: string | null
          processing_capacity_value?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_processing_facilities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_processor_profiles: {
        Row: {
          business_email: string | null
          business_phone: string | null
          challenges: string[]
          created_at: string
          created_by: string
          employees_count: number | null
          id: string
          ifu: string | null
          legal_form: string | null
          onboarding_completed: boolean
          onboarding_step: number
          organization_id: string
          rccm: string | null
          trade_name: string | null
          updated_at: string
          value_chains: string[]
          year_established: number | null
        }
        Insert: {
          business_email?: string | null
          business_phone?: string | null
          challenges?: string[]
          created_at?: string
          created_by?: string
          employees_count?: number | null
          id?: string
          ifu?: string | null
          legal_form?: string | null
          onboarding_completed?: boolean
          onboarding_step?: number
          organization_id: string
          rccm?: string | null
          trade_name?: string | null
          updated_at?: string
          value_chains?: string[]
          year_established?: number | null
        }
        Update: {
          business_email?: string | null
          business_phone?: string | null
          challenges?: string[]
          created_at?: string
          created_by?: string
          employees_count?: number | null
          id?: string
          ifu?: string | null
          legal_form?: string | null
          onboarding_completed?: boolean
          onboarding_step?: number
          organization_id?: string
          rccm?: string | null
          trade_name?: string | null
          updated_at?: string
          value_chains?: string[]
          year_established?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "v2_processor_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_procurement_order_lines: {
        Row: {
          accepted_tonnes: number
          agreed_unit_price: number | null
          commitment_id: string | null
          created_at: string
          crop_id: string | null
          id: string
          line_amount: number | null
          notes: string | null
          order_id: string
          ordered_quantity: number
          ordered_tonnes: number
          price_unit: string | null
          received_tonnes: number
          rejected_tonnes: number
          supply_id: string | null
          unit_code: string
          updated_at: string
          variety_id: string | null
        }
        Insert: {
          accepted_tonnes?: number
          agreed_unit_price?: number | null
          commitment_id?: string | null
          created_at?: string
          crop_id?: string | null
          id?: string
          line_amount?: number | null
          notes?: string | null
          order_id: string
          ordered_quantity: number
          ordered_tonnes?: number
          price_unit?: string | null
          received_tonnes?: number
          rejected_tonnes?: number
          supply_id?: string | null
          unit_code?: string
          updated_at?: string
          variety_id?: string | null
        }
        Update: {
          accepted_tonnes?: number
          agreed_unit_price?: number | null
          commitment_id?: string | null
          created_at?: string
          crop_id?: string | null
          id?: string
          line_amount?: number | null
          notes?: string | null
          order_id?: string
          ordered_quantity?: number
          ordered_tonnes?: number
          price_unit?: string | null
          received_tonnes?: number
          rejected_tonnes?: number
          supply_id?: string | null
          unit_code?: string
          updated_at?: string
          variety_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "v2_procurement_order_lines_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "v2_supply_commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_procurement_order_lines_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "v2_crops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_procurement_order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v2_procurement_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_procurement_order_lines_supply_id_fkey"
            columns: ["supply_id"]
            isOneToOne: false
            referencedRelation: "v2_supply_availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_procurement_order_lines_variety_id_fkey"
            columns: ["variety_id"]
            isOneToOne: false
            referencedRelation: "v2_crop_varieties"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_procurement_orders: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          commercial_notes: string | null
          commitment_id: string | null
          created_at: string
          created_by: string
          currency: string
          delivery_location: string | null
          expected_delivery_end: string | null
          expected_delivery_start: string | null
          facility_id: string | null
          id: string
          order_number: string
          organization_id: string
          packaging_requirement: string | null
          payment_status: Database["public"]["Enums"]["v2_payment_status"]
          quality_requirement: string | null
          sourcing_request_id: string | null
          status: Database["public"]["Enums"]["v2_procurement_status"]
          supplier_id: string
          total_expected_amount: number | null
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          commercial_notes?: string | null
          commitment_id?: string | null
          created_at?: string
          created_by: string
          currency?: string
          delivery_location?: string | null
          expected_delivery_end?: string | null
          expected_delivery_start?: string | null
          facility_id?: string | null
          id?: string
          order_number: string
          organization_id: string
          packaging_requirement?: string | null
          payment_status?: Database["public"]["Enums"]["v2_payment_status"]
          quality_requirement?: string | null
          sourcing_request_id?: string | null
          status?: Database["public"]["Enums"]["v2_procurement_status"]
          supplier_id: string
          total_expected_amount?: number | null
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          commercial_notes?: string | null
          commitment_id?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          delivery_location?: string | null
          expected_delivery_end?: string | null
          expected_delivery_start?: string | null
          facility_id?: string | null
          id?: string
          order_number?: string
          organization_id?: string
          packaging_requirement?: string | null
          payment_status?: Database["public"]["Enums"]["v2_payment_status"]
          quality_requirement?: string | null
          sourcing_request_id?: string | null
          status?: Database["public"]["Enums"]["v2_procurement_status"]
          supplier_id?: string
          total_expected_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_procurement_orders_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "v2_supply_commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_procurement_orders_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "v2_processing_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_procurement_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_procurement_orders_sourcing_request_id_fkey"
            columns: ["sourcing_request_id"]
            isOneToOne: false
            referencedRelation: "v2_sourcing_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_procurement_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v2_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_production_batches: {
        Row: {
          batch_reference: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          facility_id: string | null
          id: string
          notes: string | null
          organization_id: string
          product_id: string | null
          production_date: string
          recipe_id: string | null
          responsible_user_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["v2_production_status"]
          total_input_tonnes: number
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          batch_reference: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          facility_id?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          product_id?: string | null
          production_date?: string
          recipe_id?: string | null
          responsible_user_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["v2_production_status"]
          total_input_tonnes?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          batch_reference?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          facility_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          product_id?: string | null
          production_date?: string
          recipe_id?: string | null
          responsible_user_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["v2_production_status"]
          total_input_tonnes?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "v2_production_batches_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "v2_processing_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_production_batches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_production_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v2_processed_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_production_batches_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "v2_production_recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_production_inputs: {
        Row: {
          created_at: string
          crop_id: string | null
          id: string
          production_batch_id: string
          quantity_tonnes: number
          raw_material_batch_id: string
          unit_code: string
          variety_id: string | null
        }
        Insert: {
          created_at?: string
          crop_id?: string | null
          id?: string
          production_batch_id: string
          quantity_tonnes: number
          raw_material_batch_id: string
          unit_code?: string
          variety_id?: string | null
        }
        Update: {
          created_at?: string
          crop_id?: string | null
          id?: string
          production_batch_id?: string
          quantity_tonnes?: number
          raw_material_batch_id?: string
          unit_code?: string
          variety_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "v2_production_inputs_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "v2_crops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_production_inputs_production_batch_id_fkey"
            columns: ["production_batch_id"]
            isOneToOne: false
            referencedRelation: "v2_production_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_production_inputs_raw_material_batch_id_fkey"
            columns: ["raw_material_batch_id"]
            isOneToOne: false
            referencedRelation: "v2_raw_material_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_production_inputs_variety_id_fkey"
            columns: ["variety_id"]
            isOneToOne: false
            referencedRelation: "v2_crop_varieties"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_production_outputs: {
        Row: {
          created_at: string
          finished_batch_id: string | null
          id: string
          label: string | null
          loss_category:
            | Database["public"]["Enums"]["v2_production_loss_category"]
            | null
          notes: string | null
          output_type: Database["public"]["Enums"]["v2_production_output_type"]
          product_id: string | null
          production_batch_id: string
          quantity: number
          unit_code: string
        }
        Insert: {
          created_at?: string
          finished_batch_id?: string | null
          id?: string
          label?: string | null
          loss_category?:
            | Database["public"]["Enums"]["v2_production_loss_category"]
            | null
          notes?: string | null
          output_type: Database["public"]["Enums"]["v2_production_output_type"]
          product_id?: string | null
          production_batch_id: string
          quantity: number
          unit_code?: string
        }
        Update: {
          created_at?: string
          finished_batch_id?: string | null
          id?: string
          label?: string | null
          loss_category?:
            | Database["public"]["Enums"]["v2_production_loss_category"]
            | null
          notes?: string | null
          output_type?: Database["public"]["Enums"]["v2_production_output_type"]
          product_id?: string | null
          production_batch_id?: string
          quantity?: number
          unit_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_production_outputs_finished_batch_id_fkey"
            columns: ["finished_batch_id"]
            isOneToOne: false
            referencedRelation: "v2_finished_product_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_production_outputs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v2_processed_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_production_outputs_production_batch_id_fkey"
            columns: ["production_batch_id"]
            isOneToOne: false
            referencedRelation: "v2_production_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_production_recipe_inputs: {
        Row: {
          created_at: string
          crop_id: string | null
          id: string
          notes: string | null
          quantity: number
          recipe_id: string
          unit_code: string
          variety_id: string | null
        }
        Insert: {
          created_at?: string
          crop_id?: string | null
          id?: string
          notes?: string | null
          quantity: number
          recipe_id: string
          unit_code?: string
          variety_id?: string | null
        }
        Update: {
          created_at?: string
          crop_id?: string | null
          id?: string
          notes?: string | null
          quantity?: number
          recipe_id?: string
          unit_code?: string
          variety_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "v2_production_recipe_inputs_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "v2_crops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_production_recipe_inputs_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "v2_production_recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_production_recipe_inputs_variety_id_fkey"
            columns: ["variety_id"]
            isOneToOne: false
            referencedRelation: "v2_crop_varieties"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_production_recipe_outputs: {
        Row: {
          created_at: string
          id: string
          label: string | null
          output_type: Database["public"]["Enums"]["v2_production_output_type"]
          product_id: string | null
          quantity: number
          recipe_id: string
          unit_code: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          output_type?: Database["public"]["Enums"]["v2_production_output_type"]
          product_id?: string | null
          quantity: number
          recipe_id: string
          unit_code?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          output_type?: Database["public"]["Enums"]["v2_production_output_type"]
          product_id?: string | null
          quantity?: number
          recipe_id?: string
          unit_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_production_recipe_outputs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v2_processed_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_production_recipe_outputs_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "v2_production_recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_production_recipes: {
        Row: {
          created_at: string
          created_by: string | null
          expected_output_quantity: number | null
          expected_output_unit: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          organization_id: string
          product_id: string | null
          reference_input_quantity: number
          reference_input_unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_output_quantity?: number | null
          expected_output_unit?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          organization_id: string
          product_id?: string | null
          reference_input_quantity?: number
          reference_input_unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_output_quantity?: number | null
          expected_output_unit?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          organization_id?: string
          product_id?: string | null
          reference_input_quantity?: number
          reference_input_unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_production_recipes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_production_recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v2_processed_products"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_raw_material_batches: {
        Row: {
          batch_reference: string
          created_at: string
          crop_cycle_id: string | null
          crop_id: string | null
          current_tonnes: number
          delivery_id: string | null
          facility_id: string | null
          farm_id: string | null
          id: string
          order_id: string | null
          organization_id: string
          quality_grade: string | null
          quality_status: Database["public"]["Enums"]["v2_receipt_quality"]
          receipt_date: string
          receipt_id: string | null
          received_tonnes: number
          storage_location: string | null
          supplier_id: string | null
          supply_id: string | null
          unit_code: string
          updated_at: string
          variety_id: string | null
        }
        Insert: {
          batch_reference: string
          created_at?: string
          crop_cycle_id?: string | null
          crop_id?: string | null
          current_tonnes?: number
          delivery_id?: string | null
          facility_id?: string | null
          farm_id?: string | null
          id?: string
          order_id?: string | null
          organization_id: string
          quality_grade?: string | null
          quality_status?: Database["public"]["Enums"]["v2_receipt_quality"]
          receipt_date?: string
          receipt_id?: string | null
          received_tonnes?: number
          storage_location?: string | null
          supplier_id?: string | null
          supply_id?: string | null
          unit_code?: string
          updated_at?: string
          variety_id?: string | null
        }
        Update: {
          batch_reference?: string
          created_at?: string
          crop_cycle_id?: string | null
          crop_id?: string | null
          current_tonnes?: number
          delivery_id?: string | null
          facility_id?: string | null
          farm_id?: string | null
          id?: string
          order_id?: string | null
          organization_id?: string
          quality_grade?: string | null
          quality_status?: Database["public"]["Enums"]["v2_receipt_quality"]
          receipt_date?: string
          receipt_id?: string | null
          received_tonnes?: number
          storage_location?: string | null
          supplier_id?: string | null
          supply_id?: string | null
          unit_code?: string
          updated_at?: string
          variety_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "v2_raw_material_batches_crop_cycle_id_fkey"
            columns: ["crop_cycle_id"]
            isOneToOne: false
            referencedRelation: "v2_crop_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_raw_material_batches_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "v2_crops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_raw_material_batches_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "v2_deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_raw_material_batches_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "v2_processing_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_raw_material_batches_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "v2_farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_raw_material_batches_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v2_procurement_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_raw_material_batches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_raw_material_batches_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "v2_goods_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_raw_material_batches_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v2_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_raw_material_batches_supply_id_fkey"
            columns: ["supply_id"]
            isOneToOne: false
            referencedRelation: "v2_supply_availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_raw_material_batches_variety_id_fkey"
            columns: ["variety_id"]
            isOneToOne: false
            referencedRelation: "v2_crop_varieties"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_raw_material_needs: {
        Row: {
          created_at: string
          created_by: string
          crop: string
          crop_id: string | null
          delivery_area: string | null
          facility_id: string | null
          frequency: string
          id: string
          notes: string | null
          organization_id: string
          preferred_delivery_max: number | null
          preferred_delivery_min: number | null
          quality_preference: string | null
          quantity: number | null
          sourcing_radius_km: number | null
          sourcing_season: string | null
          status: string
          unit: string
          unit_code: string | null
          updated_at: string
          variety: string | null
          variety_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string
          crop: string
          crop_id?: string | null
          delivery_area?: string | null
          facility_id?: string | null
          frequency?: string
          id?: string
          notes?: string | null
          organization_id: string
          preferred_delivery_max?: number | null
          preferred_delivery_min?: number | null
          quality_preference?: string | null
          quantity?: number | null
          sourcing_radius_km?: number | null
          sourcing_season?: string | null
          status?: string
          unit?: string
          unit_code?: string | null
          updated_at?: string
          variety?: string | null
          variety_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          crop?: string
          crop_id?: string | null
          delivery_area?: string | null
          facility_id?: string | null
          frequency?: string
          id?: string
          notes?: string | null
          organization_id?: string
          preferred_delivery_max?: number | null
          preferred_delivery_min?: number | null
          quality_preference?: string | null
          quantity?: number | null
          sourcing_radius_km?: number | null
          sourcing_season?: string | null
          status?: string
          unit?: string
          unit_code?: string | null
          updated_at?: string
          variety?: string | null
          variety_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "v2_raw_material_needs_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "v2_crops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_raw_material_needs_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "v2_processing_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_raw_material_needs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_raw_material_needs_variety_id_fkey"
            columns: ["variety_id"]
            isOneToOne: false
            referencedRelation: "v2_crop_varieties"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_reconfirmation_tasks: {
        Row: {
          commitment_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          crop_cycle_id: string | null
          crop_id: string | null
          due_date: string | null
          field_agent_id: string | null
          id: string
          needed_by: string | null
          observation: string | null
          priority: string
          reason: string | null
          result_asking_price: number | null
          result_available_end: string | null
          result_available_start: string | null
          result_quality_grade: string | null
          result_quantity: number | null
          result_unit_code: string | null
          sourcing_request_id: string | null
          status: Database["public"]["Enums"]["v2_reconfirmation_status"]
          supplier_id: string
          supply_id: string | null
          task_kind: string
          updated_at: string
        }
        Insert: {
          commitment_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          crop_cycle_id?: string | null
          crop_id?: string | null
          due_date?: string | null
          field_agent_id?: string | null
          id?: string
          needed_by?: string | null
          observation?: string | null
          priority?: string
          reason?: string | null
          result_asking_price?: number | null
          result_available_end?: string | null
          result_available_start?: string | null
          result_quality_grade?: string | null
          result_quantity?: number | null
          result_unit_code?: string | null
          sourcing_request_id?: string | null
          status?: Database["public"]["Enums"]["v2_reconfirmation_status"]
          supplier_id: string
          supply_id?: string | null
          task_kind?: string
          updated_at?: string
        }
        Update: {
          commitment_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          crop_cycle_id?: string | null
          crop_id?: string | null
          due_date?: string | null
          field_agent_id?: string | null
          id?: string
          needed_by?: string | null
          observation?: string | null
          priority?: string
          reason?: string | null
          result_asking_price?: number | null
          result_available_end?: string | null
          result_available_start?: string | null
          result_quality_grade?: string | null
          result_quantity?: number | null
          result_unit_code?: string | null
          sourcing_request_id?: string | null
          status?: Database["public"]["Enums"]["v2_reconfirmation_status"]
          supplier_id?: string
          supply_id?: string | null
          task_kind?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_reconfirmation_tasks_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "v2_supply_commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_reconfirmation_tasks_crop_cycle_id_fkey"
            columns: ["crop_cycle_id"]
            isOneToOne: false
            referencedRelation: "v2_crop_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_reconfirmation_tasks_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "v2_crops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_reconfirmation_tasks_field_agent_id_fkey"
            columns: ["field_agent_id"]
            isOneToOne: false
            referencedRelation: "v2_field_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_reconfirmation_tasks_sourcing_request_id_fkey"
            columns: ["sourcing_request_id"]
            isOneToOne: false
            referencedRelation: "v2_sourcing_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_reconfirmation_tasks_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v2_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_reconfirmation_tasks_supply_id_fkey"
            columns: ["supply_id"]
            isOneToOne: false
            referencedRelation: "v2_supply_availability"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_reference_counters: {
        Row: {
          current_value: number
          prefix: string
          year: number
        }
        Insert: {
          current_value?: number
          prefix: string
          year: number
        }
        Update: {
          current_value?: number
          prefix?: string
          year?: number
        }
        Relationships: []
      }
      v2_sales_allocations: {
        Row: {
          created_at: string
          dispatched_quantity: number
          finished_batch_id: string
          id: string
          organization_id: string
          quantity: number
          released_quantity: number
          sales_order_id: string
          sales_order_line_id: string
          status: Database["public"]["Enums"]["v2_allocation_status"]
          unit_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dispatched_quantity?: number
          finished_batch_id: string
          id?: string
          organization_id: string
          quantity: number
          released_quantity?: number
          sales_order_id: string
          sales_order_line_id: string
          status?: Database["public"]["Enums"]["v2_allocation_status"]
          unit_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dispatched_quantity?: number
          finished_batch_id?: string
          id?: string
          organization_id?: string
          quantity?: number
          released_quantity?: number
          sales_order_id?: string
          sales_order_line_id?: string
          status?: Database["public"]["Enums"]["v2_allocation_status"]
          unit_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_sales_allocations_finished_batch_id_fkey"
            columns: ["finished_batch_id"]
            isOneToOne: false
            referencedRelation: "v2_finished_product_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_sales_allocations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_sales_allocations_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "v2_sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_sales_allocations_sales_order_line_id_fkey"
            columns: ["sales_order_line_id"]
            isOneToOne: false
            referencedRelation: "v2_sales_order_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_sales_dispatch_lines: {
        Row: {
          allocation_id: string | null
          created_at: string
          dispatch_id: string
          finished_batch_id: string
          id: string
          organization_id: string
          quantity: number
          sales_order_line_id: string
          unit_code: string
        }
        Insert: {
          allocation_id?: string | null
          created_at?: string
          dispatch_id: string
          finished_batch_id: string
          id?: string
          organization_id: string
          quantity: number
          sales_order_line_id: string
          unit_code: string
        }
        Update: {
          allocation_id?: string | null
          created_at?: string
          dispatch_id?: string
          finished_batch_id?: string
          id?: string
          organization_id?: string
          quantity?: number
          sales_order_line_id?: string
          unit_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_sales_dispatch_lines_allocation_id_fkey"
            columns: ["allocation_id"]
            isOneToOne: false
            referencedRelation: "v2_sales_allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_sales_dispatch_lines_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "v2_sales_dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_sales_dispatch_lines_finished_batch_id_fkey"
            columns: ["finished_batch_id"]
            isOneToOne: false
            referencedRelation: "v2_finished_product_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_sales_dispatch_lines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_sales_dispatch_lines_sales_order_line_id_fkey"
            columns: ["sales_order_line_id"]
            isOneToOne: false
            referencedRelation: "v2_sales_order_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_sales_dispatches: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          dispatch_date: string
          dispatch_reference: string
          facility_id: string | null
          id: string
          notes: string | null
          organization_id: string
          reversal_reason: string | null
          reversed_at: string | null
          reversed_by: string | null
          sales_order_id: string
          status: Database["public"]["Enums"]["v2_dispatch_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          dispatch_date?: string
          dispatch_reference: string
          facility_id?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          sales_order_id: string
          status?: Database["public"]["Enums"]["v2_dispatch_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          dispatch_date?: string
          dispatch_reference?: string
          facility_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          sales_order_id?: string
          status?: Database["public"]["Enums"]["v2_dispatch_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_sales_dispatches_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v2_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_sales_dispatches_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "v2_processing_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_sales_dispatches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_sales_dispatches_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "v2_sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_sales_order_lines: {
        Row: {
          created_at: string
          discount_amount: number
          dispatched_quantity: number
          id: string
          line_total: number | null
          notes: string | null
          organization_id: string
          product_id: string
          quantity: number
          sales_order_id: string
          unit_code: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          discount_amount?: number
          dispatched_quantity?: number
          id?: string
          line_total?: number | null
          notes?: string | null
          organization_id: string
          product_id: string
          quantity: number
          sales_order_id: string
          unit_code: string
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          discount_amount?: number
          dispatched_quantity?: number
          id?: string
          line_total?: number | null
          notes?: string | null
          organization_id?: string
          product_id?: string
          quantity?: number
          sales_order_id?: string
          unit_code?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_sales_order_lines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_sales_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v2_processed_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_sales_order_lines_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "v2_sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_sales_orders: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          commercial_notes: string | null
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_id: string
          facility_id: string | null
          fulfilled_at: string | null
          id: string
          order_date: string
          organization_id: string
          paid_amount: number
          payment_status: Database["public"]["Enums"]["v2_sales_payment_status"]
          requested_delivery_date: string | null
          sales_reference: string
          status: Database["public"]["Enums"]["v2_sales_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          commercial_notes?: string | null
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id: string
          facility_id?: string | null
          fulfilled_at?: string | null
          id?: string
          order_date?: string
          organization_id: string
          paid_amount?: number
          payment_status?: Database["public"]["Enums"]["v2_sales_payment_status"]
          requested_delivery_date?: string | null
          sales_reference: string
          status?: Database["public"]["Enums"]["v2_sales_status"]
          total_amount?: number
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          commercial_notes?: string | null
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string
          facility_id?: string | null
          fulfilled_at?: string | null
          id?: string
          order_date?: string
          organization_id?: string
          paid_amount?: number
          payment_status?: Database["public"]["Enums"]["v2_sales_payment_status"]
          requested_delivery_date?: string | null
          sales_reference?: string
          status?: Database["public"]["Enums"]["v2_sales_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v2_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_sales_orders_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "v2_processing_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_sales_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_settings: {
        Row: {
          created_at: string
          description: string | null
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      v2_sourcing_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          payload: Json
          sourcing_request_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          sourcing_request_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          sourcing_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_sourcing_events_sourcing_request_id_fkey"
            columns: ["sourcing_request_id"]
            isOneToOne: false
            referencedRelation: "v2_sourcing_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_sourcing_match_runs: {
        Row: {
          coverage_ratio: number | null
          created_at: string
          created_by: string | null
          high_confidence_tonnes: number | null
          id: string
          identified_tonnes: number | null
          match_count: number
          near_match_count: number
          recommended_set: Json
          requested_tonnes: number | null
          sourcing_request_id: string
          supplier_count: number
          weighted_avg_distance_km: number | null
        }
        Insert: {
          coverage_ratio?: number | null
          created_at?: string
          created_by?: string | null
          high_confidence_tonnes?: number | null
          id?: string
          identified_tonnes?: number | null
          match_count?: number
          near_match_count?: number
          recommended_set?: Json
          requested_tonnes?: number | null
          sourcing_request_id: string
          supplier_count?: number
          weighted_avg_distance_km?: number | null
        }
        Update: {
          coverage_ratio?: number | null
          created_at?: string
          created_by?: string | null
          high_confidence_tonnes?: number | null
          id?: string
          identified_tonnes?: number | null
          match_count?: number
          near_match_count?: number
          recommended_set?: Json
          requested_tonnes?: number | null
          sourcing_request_id?: string
          supplier_count?: number
          weighted_avg_distance_km?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "v2_sourcing_match_runs_sourcing_request_id_fkey"
            columns: ["sourcing_request_id"]
            isOneToOne: false
            referencedRelation: "v2_sourcing_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_sourcing_requests: {
        Row: {
          availability_end: string
          availability_start: string
          certification_mandatory: boolean
          certification_requirement: string | null
          created_at: string
          created_by: string
          crop_id: string
          facility_id: string | null
          id: string
          max_distance_km: number | null
          max_quantity_per_supplier: number | null
          min_quantity_per_supplier: number | null
          notes: string | null
          organization_id: string
          packaging_requirement: string | null
          price_unit: string | null
          quality_requirement: string | null
          reference: string
          requested_quantity: number
          status: Database["public"]["Enums"]["v2_sourcing_status"]
          strict_radius: boolean
          target_price: number | null
          unit_code: string
          updated_at: string
          variety_flexible: boolean
          variety_id: string | null
        }
        Insert: {
          availability_end: string
          availability_start: string
          certification_mandatory?: boolean
          certification_requirement?: string | null
          created_at?: string
          created_by: string
          crop_id: string
          facility_id?: string | null
          id?: string
          max_distance_km?: number | null
          max_quantity_per_supplier?: number | null
          min_quantity_per_supplier?: number | null
          notes?: string | null
          organization_id: string
          packaging_requirement?: string | null
          price_unit?: string | null
          quality_requirement?: string | null
          reference?: string
          requested_quantity: number
          status?: Database["public"]["Enums"]["v2_sourcing_status"]
          strict_radius?: boolean
          target_price?: number | null
          unit_code?: string
          updated_at?: string
          variety_flexible?: boolean
          variety_id?: string | null
        }
        Update: {
          availability_end?: string
          availability_start?: string
          certification_mandatory?: boolean
          certification_requirement?: string | null
          created_at?: string
          created_by?: string
          crop_id?: string
          facility_id?: string | null
          id?: string
          max_distance_km?: number | null
          max_quantity_per_supplier?: number | null
          min_quantity_per_supplier?: number | null
          notes?: string | null
          organization_id?: string
          packaging_requirement?: string | null
          price_unit?: string | null
          quality_requirement?: string | null
          reference?: string
          requested_quantity?: number
          status?: Database["public"]["Enums"]["v2_sourcing_status"]
          strict_radius?: boolean
          target_price?: number | null
          unit_code?: string
          updated_at?: string
          variety_flexible?: boolean
          variety_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "v2_sourcing_requests_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "v2_crops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_sourcing_requests_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "v2_processing_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_sourcing_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_sourcing_requests_variety_id_fkey"
            columns: ["variety_id"]
            isOneToOne: false
            referencedRelation: "v2_crop_varieties"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_supplier_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string
          field_agent_id: string
          id: string
          is_primary: boolean
          supplier_id: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          field_agent_id: string
          id?: string
          is_primary?: boolean
          supplier_id: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          field_agent_id?: string
          id?: string
          is_primary?: boolean
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_supplier_assignments_field_agent_id_fkey"
            columns: ["field_agent_id"]
            isOneToOne: false
            referencedRelation: "v2_field_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_supplier_assignments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v2_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_suppliers: {
        Row: {
          affiliation: string | null
          arrondissement: string | null
          client_ref: string | null
          commune: string | null
          cooperative_supplier_id: string | null
          country: string
          created_at: string
          created_by: string
          department: string | null
          display_name: string
          first_name: string | null
          id: string
          is_active: boolean
          last_name: string | null
          last_verified_at: string | null
          latitude: number | null
          longitude: number | null
          notes: string | null
          phone: string | null
          phone_secondary: string | null
          preferred_language: string
          status: Database["public"]["Enums"]["v2_supplier_status"]
          supplier_code: string
          supplier_type: Database["public"]["Enums"]["v2_supplier_type"]
          updated_at: string
          user_id: string | null
          village: string | null
        }
        Insert: {
          affiliation?: string | null
          arrondissement?: string | null
          client_ref?: string | null
          commune?: string | null
          cooperative_supplier_id?: string | null
          country?: string
          created_at?: string
          created_by?: string
          department?: string | null
          display_name: string
          first_name?: string | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          last_verified_at?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          phone?: string | null
          phone_secondary?: string | null
          preferred_language?: string
          status?: Database["public"]["Enums"]["v2_supplier_status"]
          supplier_code?: string
          supplier_type?: Database["public"]["Enums"]["v2_supplier_type"]
          updated_at?: string
          user_id?: string | null
          village?: string | null
        }
        Update: {
          affiliation?: string | null
          arrondissement?: string | null
          client_ref?: string | null
          commune?: string | null
          cooperative_supplier_id?: string | null
          country?: string
          created_at?: string
          created_by?: string
          department?: string | null
          display_name?: string
          first_name?: string | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          last_verified_at?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          phone?: string | null
          phone_secondary?: string | null
          preferred_language?: string
          status?: Database["public"]["Enums"]["v2_supplier_status"]
          supplier_code?: string
          supplier_type?: Database["public"]["Enums"]["v2_supplier_type"]
          updated_at?: string
          user_id?: string | null
          village?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "v2_suppliers_cooperative_supplier_id_fkey"
            columns: ["cooperative_supplier_id"]
            isOneToOne: false
            referencedRelation: "v2_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_supply_availability: {
        Row: {
          asking_price: number | null
          availability_end: string | null
          availability_start: string | null
          certification_status: string | null
          client_ref: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string
          crop_cycle_id: string | null
          crop_id: string
          id: string
          last_confirmed_at: string | null
          notes: string | null
          price_unit: string | null
          quality_grade: string | null
          quantity_available: number
          source: string
          status: Database["public"]["Enums"]["v2_supply_status"]
          supplier_id: string
          unit_code: string
          updated_at: string
          variety_id: string | null
        }
        Insert: {
          asking_price?: number | null
          availability_end?: string | null
          availability_start?: string | null
          certification_status?: string | null
          client_ref?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string
          crop_cycle_id?: string | null
          crop_id: string
          id?: string
          last_confirmed_at?: string | null
          notes?: string | null
          price_unit?: string | null
          quality_grade?: string | null
          quantity_available: number
          source?: string
          status?: Database["public"]["Enums"]["v2_supply_status"]
          supplier_id: string
          unit_code?: string
          updated_at?: string
          variety_id?: string | null
        }
        Update: {
          asking_price?: number | null
          availability_end?: string | null
          availability_start?: string | null
          certification_status?: string | null
          client_ref?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string
          crop_cycle_id?: string | null
          crop_id?: string
          id?: string
          last_confirmed_at?: string | null
          notes?: string | null
          price_unit?: string | null
          quality_grade?: string | null
          quantity_available?: number
          source?: string
          status?: Database["public"]["Enums"]["v2_supply_status"]
          supplier_id?: string
          unit_code?: string
          updated_at?: string
          variety_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "v2_supply_availability_crop_cycle_id_fkey"
            columns: ["crop_cycle_id"]
            isOneToOne: false
            referencedRelation: "v2_crop_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_supply_availability_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "v2_crops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_supply_availability_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v2_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_supply_availability_variety_id_fkey"
            columns: ["variety_id"]
            isOneToOne: false
            referencedRelation: "v2_crop_varieties"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_supply_commitments: {
        Row: {
          agreed_unit_price: number | null
          cancellation_reason: string | null
          closed_at: string | null
          confirmation_method:
            | Database["public"]["Enums"]["v2_confirmation_method"]
            | null
          confirmed_at: string | null
          confirmed_by_user: string | null
          confirmed_end: string | null
          confirmed_quantity: number | null
          confirmed_start: string | null
          confirmed_tonnes: number
          contact_released: boolean
          created_at: string
          created_by: string
          crop_id: string | null
          currency: string
          decline_reason: string | null
          expires_at: string | null
          facility_id: string | null
          id: string
          notes: string | null
          organization_id: string
          price_unit: string | null
          proposed_quantity: number
          proposed_tonnes: number
          requested_end: string | null
          requested_start: string | null
          sourcing_request_id: string | null
          status: Database["public"]["Enums"]["v2_commitment_status"]
          supplier_id: string
          supply_id: string
          unit_code: string
          updated_at: string
          variety_id: string | null
        }
        Insert: {
          agreed_unit_price?: number | null
          cancellation_reason?: string | null
          closed_at?: string | null
          confirmation_method?:
            | Database["public"]["Enums"]["v2_confirmation_method"]
            | null
          confirmed_at?: string | null
          confirmed_by_user?: string | null
          confirmed_end?: string | null
          confirmed_quantity?: number | null
          confirmed_start?: string | null
          confirmed_tonnes?: number
          contact_released?: boolean
          created_at?: string
          created_by: string
          crop_id?: string | null
          currency?: string
          decline_reason?: string | null
          expires_at?: string | null
          facility_id?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          price_unit?: string | null
          proposed_quantity: number
          proposed_tonnes?: number
          requested_end?: string | null
          requested_start?: string | null
          sourcing_request_id?: string | null
          status?: Database["public"]["Enums"]["v2_commitment_status"]
          supplier_id: string
          supply_id: string
          unit_code?: string
          updated_at?: string
          variety_id?: string | null
        }
        Update: {
          agreed_unit_price?: number | null
          cancellation_reason?: string | null
          closed_at?: string | null
          confirmation_method?:
            | Database["public"]["Enums"]["v2_confirmation_method"]
            | null
          confirmed_at?: string | null
          confirmed_by_user?: string | null
          confirmed_end?: string | null
          confirmed_quantity?: number | null
          confirmed_start?: string | null
          confirmed_tonnes?: number
          contact_released?: boolean
          created_at?: string
          created_by?: string
          crop_id?: string | null
          currency?: string
          decline_reason?: string | null
          expires_at?: string | null
          facility_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          price_unit?: string | null
          proposed_quantity?: number
          proposed_tonnes?: number
          requested_end?: string | null
          requested_start?: string | null
          sourcing_request_id?: string | null
          status?: Database["public"]["Enums"]["v2_commitment_status"]
          supplier_id?: string
          supply_id?: string
          unit_code?: string
          updated_at?: string
          variety_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "v2_supply_commitments_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "v2_crops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_supply_commitments_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "v2_processing_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_supply_commitments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v2_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_supply_commitments_sourcing_request_id_fkey"
            columns: ["sourcing_request_id"]
            isOneToOne: false
            referencedRelation: "v2_sourcing_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_supply_commitments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v2_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_supply_commitments_supply_id_fkey"
            columns: ["supply_id"]
            isOneToOne: false
            referencedRelation: "v2_supply_availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_supply_commitments_variety_id_fkey"
            columns: ["variety_id"]
            isOneToOne: false
            referencedRelation: "v2_crop_varieties"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_units: {
        Row: {
          code: string
          created_at: string
          dimension: string
          id: string
          is_active: boolean
          name_en: string
          name_fr: string
          sort_order: number
          to_base_factor: number | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          dimension?: string
          id?: string
          is_active?: boolean
          name_en: string
          name_fr: string
          sort_order?: number
          to_base_factor?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          dimension?: string
          id?: string
          is_active?: boolean
          name_en?: string
          name_fr?: string
          sort_order?: number
          to_base_factor?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      v2_value_chains: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name_en: string
          name_fr: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_en: string
          name_fr: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_en?: string
          name_fr?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_sessions: {
        Row: {
          created_at: string
          current_state: string
          id: string
          metadata: Json
          phone_number: string
          selected_country: string | null
          selected_crop_id: string | null
          selected_region_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_state?: string
          id?: string
          metadata?: Json
          phone_number: string
          selected_country?: string | null
          selected_crop_id?: string | null
          selected_region_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_state?: string
          id?: string
          metadata?: Json
          phone_number?: string
          selected_country?: string | null
          selected_crop_id?: string | null
          selected_region_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      yield_estimates: {
        Row: {
          assumptions: string[] | null
          confidence: string | null
          created_at: string
          crop_id: string
          id: string
          region_id: string
          yield_max_t_ha: number | null
          yield_min_t_ha: number | null
        }
        Insert: {
          assumptions?: string[] | null
          confidence?: string | null
          created_at?: string
          crop_id: string
          id?: string
          region_id: string
          yield_max_t_ha?: number | null
          yield_min_t_ha?: number | null
        }
        Update: {
          assumptions?: string[] | null
          confidence?: string | null
          created_at?: string
          crop_id?: string
          id?: string
          region_id?: string
          yield_max_t_ha?: number | null
          yield_min_t_ha?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "yield_estimates_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crop_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yield_estimates_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
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
      v2_add_document_version: {
        Args: {
          _document_id: string
          _expiry_date?: string
          _file_name: string
          _issue_date?: string
          _notes?: string
          _storage_path: string
        }
        Returns: Json
      }
      v2_approx_coord: { Args: { _value: number }; Returns: number }
      v2_business_completeness: {
        Args: { _organization_id: string }
        Returns: Json
      }
      v2_business_performance: {
        Args: { _from: string; _organization_id: string; _to: string }
        Returns: Json
      }
      v2_business_trend: {
        Args: { _months?: number; _organization_id: string }
        Returns: {
          cash_collected: number
          month: string
          other_expenses: number
          procurement_spend: number
          sales_value: number
        }[]
      }
      v2_can_access_supplier: {
        Args: { _supplier_id: string; _user_id: string }
        Returns: boolean
      }
      v2_can_read_commercial_supply: {
        Args: { _user_id: string }
        Returns: boolean
      }
      v2_cancel_procurement_order: {
        Args: { _order_id: string; _reason?: string }
        Returns: undefined
      }
      v2_cancel_sales_order: {
        Args: { _reason: string; _sales_order_id: string }
        Returns: Json
      }
      v2_commercial_confirmation_feed: {
        Args: never
        Returns: {
          commitment_id: string
          commune: string
          created_at: string
          crop_name_en: string
          crop_name_fr: string
          currency: string
          expires_at: string
          phone: string
          processor_name: string
          proposed_quantity: number
          proposed_tonnes: number
          requested_end: string
          requested_start: string
          status: string
          supplier_code: string
          supplier_id: string
          supplier_name: string
          target_price: number
          task_id: string
          unit_code: string
          variety_name_en: string
          variety_name_fr: string
        }[]
      }
      v2_commercial_supply: {
        Args: {
          _available_from?: string
          _available_to?: string
          _commune?: string
          _confidence?: string[]
          _crop_id?: string
          _department?: string
          _facility_id?: string
          _freshness?: string[]
          _limit?: number
          _max_distance_km?: number
          _min_quantity_t?: number
          _offset?: number
          _quality_grade?: string
          _search?: string
          _variety_id?: string
          _verified_only?: boolean
        }
        Returns: {
          approx_latitude: number
          approx_longitude: number
          availability_end: string
          availability_start: string
          certification_status: string
          commune: string
          confidence: string
          crop_code: string
          crop_id: string
          crop_name_en: string
          crop_name_fr: string
          department: string
          distance_km: number
          freshness: string
          last_confirmed_at: string
          quality_grade: string
          quantity: number
          quantity_tonnes: number
          supplier_ref: string
          supplier_type: string
          supply_id: string
          supply_status: string
          total_count: number
          unit_code: string
          variety_code: string
          variety_id: string
          variety_name_en: string
          variety_name_fr: string
          verification_status: string
        }[]
      }
      v2_commercial_supply_history: {
        Args: { _supply_id: string }
        Returns: {
          confidence: string
          entry_date: string
          entry_type: string
          quantity: number
          quantity_tonnes: number
          unit_code: string
        }[]
      }
      v2_committed_tonnes: { Args: { _supply_id: string }; Returns: number }
      v2_complete_action: {
        Args: { _action_id: string; _evidence_id?: string; _note?: string }
        Returns: Json
      }
      v2_compliance_audit_pack: {
        Args: { _org_program_id: string; _organization_id: string }
        Returns: Json
      }
      v2_compliance_dashboard: {
        Args: { _organization_id: string }
        Returns: Json
      }
      v2_compliance_readiness: {
        Args: { _org_program_id: string; _organization_id: string }
        Returns: Json
      }
      v2_compliance_readiness_safe: {
        Args: { _org_program_id?: string; _organization_id: string }
        Returns: Json
      }
      v2_compliance_system_evidence: {
        Args: { _organization_id: string }
        Returns: {
          detail: Json
          entity_id: string
          entity_reference: string
          entity_type: string
          qualifies: boolean
          rule_code: string
        }[]
      }
      v2_confirm_commitment: {
        Args: {
          _accepted: boolean
          _commitment_id: string
          _confirmed_quantity?: number
          _end?: string
          _notes?: string
          _start?: string
          _unit_code?: string
          _unit_price?: number
        }
        Returns: {
          agreed_unit_price: number | null
          cancellation_reason: string | null
          closed_at: string | null
          confirmation_method:
            | Database["public"]["Enums"]["v2_confirmation_method"]
            | null
          confirmed_at: string | null
          confirmed_by_user: string | null
          confirmed_end: string | null
          confirmed_quantity: number | null
          confirmed_start: string | null
          confirmed_tonnes: number
          contact_released: boolean
          created_at: string
          created_by: string
          crop_id: string | null
          currency: string
          decline_reason: string | null
          expires_at: string | null
          facility_id: string | null
          id: string
          notes: string | null
          organization_id: string
          price_unit: string | null
          proposed_quantity: number
          proposed_tonnes: number
          requested_end: string | null
          requested_start: string | null
          sourcing_request_id: string | null
          status: Database["public"]["Enums"]["v2_commitment_status"]
          supplier_id: string
          supply_id: string
          unit_code: string
          updated_at: string
          variety_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "v2_supply_commitments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      v2_confirm_sales_order: {
        Args: { _allocations?: Json; _sales_order_id: string }
        Returns: Json
      }
      v2_create_finance_share: {
        Args: {
          _expires_in_days?: number
          _organization_id: string
          _recipient_email?: string
          _recipient_name: string
          _recipient_type: Database["public"]["Enums"]["v2_finance_recipient_type"]
          _scopes: Database["public"]["Enums"]["v2_finance_share_scope"][]
        }
        Returns: Json
      }
      v2_create_procurement_order: {
        Args: {
          _commitment_id: string
          _delivery_location?: string
          _expected_end?: string
          _expected_start?: string
          _notes?: string
          _packaging_requirement?: string
          _price_unit?: string
          _quality_requirement?: string
          _unit_price?: number
        }
        Returns: string
      }
      v2_create_sales_order: {
        Args: {
          _currency?: string
          _customer_id: string
          _facility_id?: string
          _lines: Json
          _notes?: string
          _order_date?: string
          _organization_id: string
          _requested_delivery_date?: string
        }
        Returns: Json
      }
      v2_data_quality_summary: {
        Args: never
        Returns: {
          issue: string
          record_count: number
        }[]
      }
      v2_distance_km: {
        Args: { _lat1: number; _lat2: number; _lng1: number; _lng2: number }
        Returns: number
      }
      v2_expense_breakdown: {
        Args: { _from: string; _organization_id: string; _to: string }
        Returns: {
          category: Database["public"]["Enums"]["v2_expense_category"]
          entries: number
          paid: number
          total: number
        }[]
      }
      v2_expire_commitments: { Args: never; Returns: number }
      v2_expiry_status: {
        Args: { _expiry: string; _threshold_days?: number }
        Returns: string
      }
      v2_finance_can_read: {
        Args: { _organization_id: string }
        Returns: boolean
      }
      v2_finance_documents_status: {
        Args: { _organization_id: string }
        Returns: Json
      }
      v2_finance_dossier: { Args: { _organization_id: string }; Returns: Json }
      v2_finance_history: { Args: { _organization_id: string }; Returns: Json }
      v2_finance_readiness: {
        Args: { _organization_id: string }
        Returns: Json
      }
      v2_finance_shared_dossier: { Args: { _token: string }; Returns: Json }
      v2_finance_snapshot: {
        Args: { _months?: number; _organization_id: string }
        Returns: Json
      }
      v2_finished_batch_direct_cost: {
        Args: { _finished_batch_id: string }
        Returns: Json
      }
      v2_finished_goods_availability: {
        Args: { _facility_id?: string; _organization_id: string }
        Returns: {
          available_quantity: number
          batch_reference: string
          expiry_date: string
          facility_id: string
          finished_batch_id: string
          physical_quantity: number
          product_id: string
          product_name: string
          production_date: string
          reserved_quantity: number
          status: string
          unit_code: string
        }[]
      }
      v2_finished_goods_stock: {
        Args: { _facility_id?: string; _organization_id: string }
        Returns: {
          batch_reference: string
          expiry_date: string
          facility_id: string
          facility_name: string
          finished_batch_id: string
          product_id: string
          product_name: string
          production_batch_id: string
          production_date: string
          production_reference: string
          quality_status: string
          quantity_available: number
          quantity_produced: number
          status: string
          storage_location: string
          unit_code: string
        }[]
      }
      v2_freshness_status: { Args: { _reference: string }; Returns: string }
      v2_has_org_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["v2_org_role"]
          _user_id: string
        }
        Returns: boolean
      }
      v2_inventory_balance: {
        Args: { _facility_id?: string; _organization_id: string }
        Returns: {
          balance_tonnes: number
          batch_count: number
          crop_id: string
          crop_name_en: string
          crop_name_fr: string
          last_movement_at: string
          variety_id: string
          variety_name_en: string
          variety_name_fr: string
        }[]
      }
      v2_is_agrigrid_admin: { Args: { _user_id: string }; Returns: boolean }
      v2_is_field_agent: { Args: { _user_id: string }; Returns: boolean }
      v2_is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      v2_is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      v2_next_ref: {
        Args: {
          _column: string
          _organization_id: string
          _prefix: string
          _table: unknown
        }
        Returns: string
      }
      v2_next_reference: { Args: { _prefix: string }; Returns: string }
      v2_post_dispatch: {
        Args: {
          _dispatch_date?: string
          _lines: Json
          _notes?: string
          _sales_order_id: string
        }
        Returns: Json
      }
      v2_post_production: {
        Args: {
          _facility_id: string
          _inputs: Json
          _notes?: string
          _organization_id: string
          _outputs: Json
          _product_id: string
          _production_date?: string
          _recipe_id?: string
        }
        Returns: Json
      }
      v2_procurement_summary: {
        Args: { _organization_id: string }
        Returns: {
          confirmed_tonnes: number
          expected_deliveries: number
          inventory_tonnes: number
          open_orders: number
          open_requests: number
          ordered_tonnes: number
          pending_confirmations: number
          received_tonnes_30d: number
        }[]
      }
      v2_production_summary: {
        Args: { _organization_id: string }
        Returns: {
          batches_this_month: number
          completed_batches: number
          finished_batches: number
          input_tonnes_this_month: number
          outputs_this_month: Json
          raw_inventory_tonnes: number
        }[]
      }
      v2_propose_commitment: {
        Args: {
          _end?: string
          _notes?: string
          _quantity: number
          _request_id: string
          _start?: string
          _supply_id: string
          _target_price?: number
          _unit_code?: string
        }
        Returns: string
      }
      v2_receive_goods: {
        Args: {
          _accept_over_delivery?: boolean
          _accepted_quantity: number
          _condition_notes?: string
          _delivered_quantity: number
          _delivery_id: string
          _photos?: Json
          _quality_grade?: string
          _quality_result?: string
          _receiving_notes?: string
          _rejected_quantity?: number
          _storage_location?: string
          _unit_code?: string
        }
        Returns: string
      }
      v2_recompute_payment_status: {
        Args: { _order_id: string }
        Returns: undefined
      }
      v2_reconfirmation_task_feed: {
        Args: never
        Returns: {
          commitment_id: string
          commune: string
          created_at: string
          crop_id: string
          crop_name_en: string
          crop_name_fr: string
          current_quantity: number
          current_unit: string
          due_date: string
          last_confirmed_at: string
          needed_by: string
          priority: string
          proposed_tonnes: number
          reason: string
          status: string
          supplier_code: string
          supplier_id: string
          supplier_name: string
          supply_id: string
          task_id: string
          task_kind: string
        }[]
      }
      v2_record_assessment: {
        Args: {
          _comment?: string
          _facility_id?: string
          _org_program_id: string
          _requirement_id: string
          _response: Database["public"]["Enums"]["v2_assessment_response"]
        }
        Returns: Json
      }
      v2_record_customer_payment: {
        Args: {
          _amount: number
          _cash_account_id?: string
          _document_path?: string
          _notes?: string
          _payment_date?: string
          _payment_method?: Database["public"]["Enums"]["v2_payment_method"]
          _reference?: string
          _sales_order_id: string
        }
        Returns: Json
      }
      v2_release_commitment: {
        Args: { _cancel?: boolean; _commitment_id: string; _reason?: string }
        Returns: undefined
      }
      v2_request_commitments: {
        Args: { _request_id: string }
        Returns: {
          accepted_tonnes: number
          agreed_unit_price: number
          commitment_id: string
          confirmation_method: string
          confirmed_at: string
          confirmed_end: string
          confirmed_start: string
          confirmed_tonnes: number
          contact_name: string
          contact_phone: string
          contact_released: boolean
          created_at: string
          crop_name_en: string
          crop_name_fr: string
          currency: string
          expires_at: string
          notes: string
          order_id: string
          order_number: string
          order_status: string
          ordered_tonnes: number
          proposed_tonnes: number
          requested_end: string
          requested_start: string
          status: string
          supplier_code: string
          supplier_id: string
          supplier_ref: string
          supply_id: string
          task_status: string
          unit_code: string
          variety_name_en: string
          variety_name_fr: string
        }[]
      }
      v2_request_supply_reconfirmation: {
        Args: {
          _due_date?: string
          _priority?: string
          _reason?: string
          _request_id: string
          _supply_id: string
        }
        Returns: string
      }
      v2_reverse_customer_payment: {
        Args: { _payment_id: string; _reason: string }
        Returns: Json
      }
      v2_reverse_dispatch: {
        Args: { _dispatch_id: string; _reason: string }
        Returns: Json
      }
      v2_revoke_finance_share: { Args: { _share_id: string }; Returns: Json }
      v2_sales_active_statuses: {
        Args: never
        Returns: Database["public"]["Enums"]["v2_sales_status"][]
      }
      v2_sales_order_kpis: { Args: { _organization_id: string }; Returns: Json }
      v2_sourcing_demand_intelligence: {
        Args: never
        Returns: {
          crop_id: string
          crop_name_en: string
          crop_name_fr: string
          demand_tonnes: number
          department: string
          gap_tonnes: number
          identified_tonnes: number
          period_month: string
          request_count: number
        }[]
      }
      v2_sourcing_funnel: {
        Args: { _request_id: string }
        Returns: {
          accepted_tonnes: number
          confirmed_tonnes: number
          identified_tonnes: number
          ordered_tonnes: number
          received_tonnes: number
          remaining_to_confirm: number
          remaining_to_receive: number
          requested_tonnes: number
        }[]
      }
      v2_sourcing_matches: {
        Args: { _request_id: string }
        Returns: {
          approx_latitude: number
          approx_longitude: number
          availability_end: string
          availability_start: string
          blocking_reasons: string[]
          certification_status: string
          commune: string
          confidence: string
          crop_id: string
          crop_name_en: string
          crop_name_fr: string
          department: string
          distance_km: number
          freshness: string
          last_confirmed_at: string
          match_class: string
          overlap_days: number
          quality_grade: string
          quantity: number
          quantity_tonnes: number
          reasons: Json
          score: number
          score_breakdown: Json
          supplier_ref: string
          supplier_status: string
          supplier_type: string
          supply_id: string
          supply_status: string
          unit_code: string
          variety_id: string
          variety_name_en: string
          variety_name_fr: string
          verification_status: string
        }[]
      }
      v2_sourcing_request_tasks: {
        Args: { _request_id: string }
        Returns: {
          created_at: string
          due_date: string
          priority: string
          status: string
          supply_id: string
          task_id: string
        }[]
      }
      v2_supplier_commercial_contact: {
        Args: { _organization_id: string; _supplier_id: string }
        Returns: {
          commune: string
          department: string
          display_name: string
          phone: string
          released: boolean
          supplier_code: string
          supplier_id: string
          supplier_type: string
        }[]
      }
      v2_supply_confidence: {
        Args: {
          _confirmed_at: string
          _freshness: string
          _has_variety: boolean
          _has_window: boolean
          _supplier_status: string
          _supply_status: string
        }
        Returns: string
      }
      v2_supply_coverage: {
        Args: { _facility_id?: string; _organization_id: string }
        Returns: {
          confirmed_tonnes: number
          coverage_ratio: number
          crop_id: string
          crop_name_en: string
          crop_name_fr: string
          identified_tonnes: number
          need_id: string
          need_tonnes_per_month: number
          radius_km: number
          supplier_count: number
          variety_id: string
          variety_name_en: string
          variety_name_fr: string
        }[]
      }
      v2_supply_pipeline: {
        Args: {
          _crop_id?: string
          _facility_id?: string
          _max_distance_km?: number
          _variety_id?: string
        }
        Returns: {
          bucket: string
          quantity_tonnes: number
          record_count: number
          source: string
          supplier_count: number
        }[]
      }
      v2_supply_remaining_tonnes: {
        Args: { _supply_id: string }
        Returns: number
      }
      v2_to_tonnes: {
        Args: { _quantity: number; _unit_code: string }
        Returns: number
      }
      v2_trace_finished_batch: {
        Args: { _finished_batch_id: string }
        Returns: Json
      }
      v2_trace_finished_batch_customers: {
        Args: { _finished_batch_id: string }
        Returns: Json
      }
      v2_trace_raw_batch: { Args: { _raw_batch_id: string }; Returns: Json }
      v2_void_production: {
        Args: { _production_batch_id: string; _reason?: string }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "farmer"
        | "worker"
        | "equipment_renter"
        | "warehouse_owner"
        | "transporter"
        | "buyer"
        | "processor"
        | "wholesaler"
        | "semi_wholesaler"
      listing_status: "active" | "paused" | "sold" | "expired"
      listing_type:
        | "produce"
        | "equipment"
        | "warehouse"
        | "transport"
        | "job"
        | "processing"
      v2_action_status:
        | "open"
        | "in_progress"
        | "completed"
        | "verified"
        | "cancelled"
      v2_allocation_status:
        | "reserved"
        | "partially_dispatched"
        | "dispatched"
        | "released"
      v2_assessment_response:
        | "compliant"
        | "partially_compliant"
        | "non_compliant"
        | "not_assessed"
        | "not_applicable"
      v2_cash_account_type: "cash" | "bank" | "mobile_money"
      v2_cash_event_type:
        | "customer_payment"
        | "other_inflow"
        | "procurement_payment"
        | "operating_expense"
        | "other_outflow"
      v2_commitment_status:
        | "proposed"
        | "pending_confirmation"
        | "confirmed"
        | "partially_confirmed"
        | "declined"
        | "released"
        | "expired"
        | "cancelled"
        | "fulfilled"
      v2_compliance_category:
        | "premises"
        | "hygiene"
        | "personnel"
        | "equipment"
        | "raw_materials"
        | "water"
        | "cleaning"
        | "pest_control"
        | "waste"
        | "storage"
        | "traceability"
        | "labeling"
        | "documentation"
        | "quality_control"
        | "process_control"
        | "other"
      v2_compliance_scope: "organization" | "facility"
      v2_compliance_severity: "low" | "medium" | "high" | "critical"
      v2_confidence: "low" | "medium" | "high"
      v2_confirmation_method:
        | "supplier_self_service"
        | "field_agent"
        | "agrigrid_admin"
      v2_crop_cycle_status:
        | "planned"
        | "growing"
        | "harvest_approaching"
        | "harvesting"
        | "completed"
        | "cancelled"
      v2_customer_type:
        | "individual"
        | "retailer"
        | "wholesaler"
        | "distributor"
        | "supermarket"
        | "restaurant_hotel"
        | "exporter"
        | "institution"
        | "other"
      v2_delivery_status:
        | "scheduled"
        | "in_transit"
        | "arrived"
        | "received"
        | "partially_accepted"
        | "rejected"
        | "cancelled"
      v2_dispatch_status: "posted" | "reversed"
      v2_document_category:
        | "legal"
        | "business_registration"
        | "tax"
        | "food_safety"
        | "lab_analysis"
        | "certificate"
        | "inspection"
        | "procedure"
        | "training"
        | "facility"
        | "product"
        | "label"
        | "other"
      v2_evidence_source:
        | "user_upload"
        | "system_traceability"
        | "system_inventory"
        | "system_production"
        | "system_sales"
        | "system_document"
      v2_evidence_type:
        | "document"
        | "photo"
        | "video"
        | "text_note"
        | "external_reference"
      v2_expense_category:
        | "raw_materials"
        | "packaging"
        | "transport"
        | "labor"
        | "electricity"
        | "water"
        | "rent"
        | "maintenance"
        | "certification"
        | "marketing"
        | "administration"
        | "taxes_and_fees"
        | "other"
      v2_expense_payment_status: "unpaid" | "paid"
      v2_fg_movement_type:
        | "production_output"
        | "adjustment_in"
        | "adjustment_out"
        | "production_void"
        | "sale_dispatch"
        | "dispatch_reversal"
      v2_finance_recipient_type:
        | "bank"
        | "microfinance"
        | "investor"
        | "guarantee_fund"
        | "development_partner"
        | "advisor"
        | "other"
      v2_finance_request_status: "draft" | "in_preparation" | "ready_for_review"
      v2_finance_share_scope:
        | "business_profile"
        | "operating_metrics"
        | "sales_summary"
        | "documents"
        | "compliance_summary"
        | "full_dossier"
      v2_financing_purpose:
        | "working_capital"
        | "raw_material_purchase"
        | "equipment"
        | "facility_expansion"
        | "packaging"
        | "certification"
        | "logistics"
        | "export_development"
        | "other"
      v2_financing_type:
        | "short_term_loan"
        | "working_capital_facility"
        | "equipment_loan"
        | "invoice_financing"
        | "leasing"
        | "grant"
        | "equity"
        | "other"
      v2_finding_status:
        | "open"
        | "action_planned"
        | "in_progress"
        | "resolved"
        | "verified"
        | "dismissed"
      v2_inventory_movement_type:
        | "receipt"
        | "adjustment_in"
        | "adjustment_out"
        | "production_consumption"
      v2_org_role:
        | "processor_admin"
        | "processor_employee"
        | "field_agent"
        | "farmer"
        | "cooperative_manager"
        | "agrigrid_admin"
        | "compliance_advisor"
        | "financial_partner"
      v2_org_type: "processor" | "cooperative" | "field_network" | "agrigrid"
      v2_payment_method:
        | "cash"
        | "bank_transfer"
        | "mobile_money"
        | "cheque"
        | "other"
      v2_payment_status: "not_recorded" | "unpaid" | "partially_paid" | "paid"
      v2_procurement_status:
        | "draft"
        | "pending_supplier_confirmation"
        | "confirmed"
        | "ready_for_delivery"
        | "partially_delivered"
        | "delivered"
        | "cancelled"
        | "expired"
      v2_production_loss_category:
        | "process_loss"
        | "rejected_raw_material"
        | "peel_or_husk"
        | "damaged_output"
        | "quality_rejection"
        | "other"
      v2_production_output_type:
        | "finished_product"
        | "by_product"
        | "waste"
        | "rejected_output"
      v2_production_status: "draft" | "ready" | "completed" | "voided"
      v2_program_status:
        | "not_started"
        | "in_progress"
        | "ready_for_review"
        | "completed"
        | "archived"
      v2_receipt_quality:
        | "accepted"
        | "accepted_with_reservation"
        | "partially_accepted"
        | "rejected"
      v2_reconfirmation_status:
        | "open"
        | "assigned"
        | "in_progress"
        | "confirmed"
        | "not_available"
        | "completed"
        | "cancelled"
      v2_requirement_type:
        | "yes_no"
        | "multiple_choice"
        | "text"
        | "number"
        | "document_required"
        | "photo_required"
        | "date_required"
        | "confirmation"
      v2_sales_payment_status:
        | "unpaid"
        | "partially_paid"
        | "paid"
        | "cancelled"
      v2_sales_status:
        | "draft"
        | "confirmed"
        | "partially_fulfilled"
        | "fulfilled"
        | "cancelled"
      v2_sourcing_status:
        | "draft"
        | "open"
        | "matching"
        | "reviewing"
        | "ready_for_confirmation"
        | "partially_covered"
        | "covered"
        | "cancelled"
        | "expired"
      v2_supplier_status:
        | "unverified"
        | "field_verified"
        | "update_required"
        | "inactive"
      v2_supplier_type:
        | "individual_farmer"
        | "cooperative"
        | "producer_group"
        | "aggregator"
      v2_supply_status:
        | "forecast"
        | "expected"
        | "available"
        | "reserved"
        | "sold"
        | "expired"
        | "withdrawn"
      v2_visit_type:
        | "registration"
        | "data_update"
        | "crop_monitoring"
        | "harvest_forecast"
        | "supply_confirmation"
        | "quality_check"
        | "other"
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
      app_role: [
        "farmer",
        "worker",
        "equipment_renter",
        "warehouse_owner",
        "transporter",
        "buyer",
        "processor",
        "wholesaler",
        "semi_wholesaler",
      ],
      listing_status: ["active", "paused", "sold", "expired"],
      listing_type: [
        "produce",
        "equipment",
        "warehouse",
        "transport",
        "job",
        "processing",
      ],
      v2_action_status: [
        "open",
        "in_progress",
        "completed",
        "verified",
        "cancelled",
      ],
      v2_allocation_status: [
        "reserved",
        "partially_dispatched",
        "dispatched",
        "released",
      ],
      v2_assessment_response: [
        "compliant",
        "partially_compliant",
        "non_compliant",
        "not_assessed",
        "not_applicable",
      ],
      v2_cash_account_type: ["cash", "bank", "mobile_money"],
      v2_cash_event_type: [
        "customer_payment",
        "other_inflow",
        "procurement_payment",
        "operating_expense",
        "other_outflow",
      ],
      v2_commitment_status: [
        "proposed",
        "pending_confirmation",
        "confirmed",
        "partially_confirmed",
        "declined",
        "released",
        "expired",
        "cancelled",
        "fulfilled",
      ],
      v2_compliance_category: [
        "premises",
        "hygiene",
        "personnel",
        "equipment",
        "raw_materials",
        "water",
        "cleaning",
        "pest_control",
        "waste",
        "storage",
        "traceability",
        "labeling",
        "documentation",
        "quality_control",
        "process_control",
        "other",
      ],
      v2_compliance_scope: ["organization", "facility"],
      v2_compliance_severity: ["low", "medium", "high", "critical"],
      v2_confidence: ["low", "medium", "high"],
      v2_confirmation_method: [
        "supplier_self_service",
        "field_agent",
        "agrigrid_admin",
      ],
      v2_crop_cycle_status: [
        "planned",
        "growing",
        "harvest_approaching",
        "harvesting",
        "completed",
        "cancelled",
      ],
      v2_customer_type: [
        "individual",
        "retailer",
        "wholesaler",
        "distributor",
        "supermarket",
        "restaurant_hotel",
        "exporter",
        "institution",
        "other",
      ],
      v2_delivery_status: [
        "scheduled",
        "in_transit",
        "arrived",
        "received",
        "partially_accepted",
        "rejected",
        "cancelled",
      ],
      v2_dispatch_status: ["posted", "reversed"],
      v2_document_category: [
        "legal",
        "business_registration",
        "tax",
        "food_safety",
        "lab_analysis",
        "certificate",
        "inspection",
        "procedure",
        "training",
        "facility",
        "product",
        "label",
        "other",
      ],
      v2_evidence_source: [
        "user_upload",
        "system_traceability",
        "system_inventory",
        "system_production",
        "system_sales",
        "system_document",
      ],
      v2_evidence_type: [
        "document",
        "photo",
        "video",
        "text_note",
        "external_reference",
      ],
      v2_expense_category: [
        "raw_materials",
        "packaging",
        "transport",
        "labor",
        "electricity",
        "water",
        "rent",
        "maintenance",
        "certification",
        "marketing",
        "administration",
        "taxes_and_fees",
        "other",
      ],
      v2_expense_payment_status: ["unpaid", "paid"],
      v2_fg_movement_type: [
        "production_output",
        "adjustment_in",
        "adjustment_out",
        "production_void",
        "sale_dispatch",
        "dispatch_reversal",
      ],
      v2_finance_recipient_type: [
        "bank",
        "microfinance",
        "investor",
        "guarantee_fund",
        "development_partner",
        "advisor",
        "other",
      ],
      v2_finance_request_status: [
        "draft",
        "in_preparation",
        "ready_for_review",
      ],
      v2_finance_share_scope: [
        "business_profile",
        "operating_metrics",
        "sales_summary",
        "documents",
        "compliance_summary",
        "full_dossier",
      ],
      v2_financing_purpose: [
        "working_capital",
        "raw_material_purchase",
        "equipment",
        "facility_expansion",
        "packaging",
        "certification",
        "logistics",
        "export_development",
        "other",
      ],
      v2_financing_type: [
        "short_term_loan",
        "working_capital_facility",
        "equipment_loan",
        "invoice_financing",
        "leasing",
        "grant",
        "equity",
        "other",
      ],
      v2_finding_status: [
        "open",
        "action_planned",
        "in_progress",
        "resolved",
        "verified",
        "dismissed",
      ],
      v2_inventory_movement_type: [
        "receipt",
        "adjustment_in",
        "adjustment_out",
        "production_consumption",
      ],
      v2_org_role: [
        "processor_admin",
        "processor_employee",
        "field_agent",
        "farmer",
        "cooperative_manager",
        "agrigrid_admin",
        "compliance_advisor",
        "financial_partner",
      ],
      v2_org_type: ["processor", "cooperative", "field_network", "agrigrid"],
      v2_payment_method: [
        "cash",
        "bank_transfer",
        "mobile_money",
        "cheque",
        "other",
      ],
      v2_payment_status: ["not_recorded", "unpaid", "partially_paid", "paid"],
      v2_procurement_status: [
        "draft",
        "pending_supplier_confirmation",
        "confirmed",
        "ready_for_delivery",
        "partially_delivered",
        "delivered",
        "cancelled",
        "expired",
      ],
      v2_production_loss_category: [
        "process_loss",
        "rejected_raw_material",
        "peel_or_husk",
        "damaged_output",
        "quality_rejection",
        "other",
      ],
      v2_production_output_type: [
        "finished_product",
        "by_product",
        "waste",
        "rejected_output",
      ],
      v2_production_status: ["draft", "ready", "completed", "voided"],
      v2_program_status: [
        "not_started",
        "in_progress",
        "ready_for_review",
        "completed",
        "archived",
      ],
      v2_receipt_quality: [
        "accepted",
        "accepted_with_reservation",
        "partially_accepted",
        "rejected",
      ],
      v2_reconfirmation_status: [
        "open",
        "assigned",
        "in_progress",
        "confirmed",
        "not_available",
        "completed",
        "cancelled",
      ],
      v2_requirement_type: [
        "yes_no",
        "multiple_choice",
        "text",
        "number",
        "document_required",
        "photo_required",
        "date_required",
        "confirmation",
      ],
      v2_sales_payment_status: [
        "unpaid",
        "partially_paid",
        "paid",
        "cancelled",
      ],
      v2_sales_status: [
        "draft",
        "confirmed",
        "partially_fulfilled",
        "fulfilled",
        "cancelled",
      ],
      v2_sourcing_status: [
        "draft",
        "open",
        "matching",
        "reviewing",
        "ready_for_confirmation",
        "partially_covered",
        "covered",
        "cancelled",
        "expired",
      ],
      v2_supplier_status: [
        "unverified",
        "field_verified",
        "update_required",
        "inactive",
      ],
      v2_supplier_type: [
        "individual_farmer",
        "cooperative",
        "producer_group",
        "aggregator",
      ],
      v2_supply_status: [
        "forecast",
        "expected",
        "available",
        "reserved",
        "sold",
        "expired",
        "withdrawn",
      ],
      v2_visit_type: [
        "registration",
        "data_update",
        "crop_monitoring",
        "harvest_forecast",
        "supply_confirmation",
        "quality_check",
        "other",
      ],
    },
  },
} as const
