CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL UNIQUE,
  current_state text NOT NULL DEFAULT 'menu',
  selected_country text,
  selected_region_id uuid,
  selected_crop_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- No public policies: service role bypasses RLS and is the only writer/reader.

CREATE TRIGGER update_whatsapp_sessions_updated_at
BEFORE UPDATE ON public.whatsapp_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone ON public.whatsapp_sessions(phone_number);