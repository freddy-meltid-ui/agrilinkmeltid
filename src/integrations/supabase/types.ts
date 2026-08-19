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
      v2_has_org_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["v2_org_role"]
          _user_id: string
        }
        Returns: boolean
      }
      v2_is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      v2_is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
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
    },
  },
} as const
