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
          created_at: string
          created_by: string
          facility_id: string | null
          id: string
          notes: string | null
          organization_id: string
          product_name: string
          production_capacity_period: string | null
          production_capacity_unit: string | null
          production_capacity_value: number | null
          updated_at: string
          value_chain: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string
          facility_id?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          product_name: string
          production_capacity_period?: string | null
          production_capacity_unit?: string | null
          production_capacity_value?: number | null
          updated_at?: string
          value_chain?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          facility_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          product_name?: string
          production_capacity_period?: string | null
          production_capacity_unit?: string | null
          production_capacity_value?: number | null
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
          updated_at: string
        }
        Insert: {
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
          updated_at?: string
        }
        Update: {
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
          updated_at?: string
        }
        Relationships: [
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
      v2_approx_coord: { Args: { _value: number }; Returns: number }
      v2_can_access_supplier: {
        Args: { _supplier_id: string; _user_id: string }
        Returns: boolean
      }
      v2_can_read_commercial_supply: {
        Args: { _user_id: string }
        Returns: boolean
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
      v2_freshness_status: { Args: { _reference: string }; Returns: string }
      v2_has_org_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["v2_org_role"]
          _user_id: string
        }
        Returns: boolean
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
      v2_reconfirmation_task_feed: {
        Args: never
        Returns: {
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
          reason: string
          status: string
          supplier_code: string
          supplier_id: string
          supplier_name: string
          supply_id: string
          task_id: string
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
      v2_to_tonnes: {
        Args: { _quantity: number; _unit_code: string }
        Returns: number
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
      v2_confidence: "low" | "medium" | "high"
      v2_crop_cycle_status:
        | "planned"
        | "growing"
        | "harvest_approaching"
        | "harvesting"
        | "completed"
        | "cancelled"
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
      v2_reconfirmation_status:
        | "open"
        | "assigned"
        | "in_progress"
        | "confirmed"
        | "not_available"
        | "completed"
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
      v2_confidence: ["low", "medium", "high"],
      v2_crop_cycle_status: [
        "planned",
        "growing",
        "harvest_approaching",
        "harvesting",
        "completed",
        "cancelled",
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
      v2_reconfirmation_status: [
        "open",
        "assigned",
        "in_progress",
        "confirmed",
        "not_available",
        "completed",
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
