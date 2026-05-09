
CREATE TABLE public.field_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  region_id uuid REFERENCES public.regions(id) ON DELETE SET NULL,
  session_type text NOT NULL CHECK (session_type IN ('farmer_visit','cooperative_visit','buyer_visit','field_survey')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','synced','reviewed')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  synced_at timestamptz
);
ALTER TABLE public.field_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own field_sessions select" ON public.field_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own field_sessions insert" ON public.field_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own field_sessions update" ON public.field_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE INDEX idx_field_sessions_user ON public.field_sessions(user_id);

CREATE TABLE public.farmer_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  region_id uuid REFERENCES public.regions(id) ON DELETE SET NULL,
  crop_id uuid REFERENCES public.crop_profiles(id) ON DELETE SET NULL,
  interest_type text NOT NULL CHECK (interest_type IN ('cultivate','learn_more','find_resources','find_buyer')),
  farm_size_ha numeric,
  phone_number text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  synced_at timestamptz
);
ALTER TABLE public.farmer_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own farmer_interests select" ON public.farmer_interests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own farmer_interests insert" ON public.farmer_interests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own farmer_interests update" ON public.farmer_interests FOR UPDATE USING (auth.uid() = user_id);
CREATE INDEX idx_farmer_interests_user ON public.farmer_interests(user_id);
