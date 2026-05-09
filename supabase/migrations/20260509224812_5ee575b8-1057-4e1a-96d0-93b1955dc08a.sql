
-- rainfall_profiles
CREATE TABLE public.rainfall_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  annual_avg_mm numeric,
  monthly_avg_json jsonb,
  rainy_season_start text,
  rainy_season_end text,
  dry_months text[] DEFAULT '{}',
  source text,
  confidence text CHECK (confidence IN ('low','medium','high')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rainfall_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rainfall_profiles readable" ON public.rainfall_profiles FOR SELECT USING (true);
CREATE INDEX idx_rainfall_profiles_region ON public.rainfall_profiles(region_id);

-- seasonality_profiles
CREATE TABLE public.seasonality_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  crop_id uuid NOT NULL REFERENCES public.crop_profiles(id) ON DELETE CASCADE,
  planting_window_start text,
  planting_window_end text,
  harvest_window_start text,
  harvest_window_end text,
  season_fit_score numeric,
  notes text,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seasonality_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seasonality_profiles readable" ON public.seasonality_profiles FOR SELECT USING (true);
CREATE INDEX idx_seasonality_region_crop ON public.seasonality_profiles(region_id, crop_id);

-- recommendation_scores
CREATE TABLE public.recommendation_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  crop_id uuid NOT NULL REFERENCES public.crop_profiles(id) ON DELETE CASCADE,
  soil_score numeric,
  rainfall_score numeric,
  seasonality_score numeric,
  yield_score numeric,
  market_score numeric,
  risk_score numeric,
  final_score numeric,
  confidence text CHECK (confidence IN ('low','medium','high')),
  explanation_json jsonb,
  source_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recommendation_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recommendation_scores readable" ON public.recommendation_scores FOR SELECT USING (true);
CREATE INDEX idx_recommendation_scores_region_crop ON public.recommendation_scores(region_id, crop_id);
CREATE TRIGGER update_recommendation_scores_updated_at
  BEFORE UPDATE ON public.recommendation_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- atlas_feedback
CREATE TABLE public.atlas_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  region_id uuid REFERENCES public.regions(id) ON DELETE SET NULL,
  crop_id uuid REFERENCES public.crop_profiles(id) ON DELETE SET NULL,
  feedback_type text NOT NULL CHECK (feedback_type IN ('useful','not_useful','incorrect','missing_data','other')),
  comment text,
  actor_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.atlas_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own feedback" ON public.atlas_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own feedback" ON public.atlas_feedback
  FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX idx_atlas_feedback_user ON public.atlas_feedback(user_id);
