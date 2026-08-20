CREATE TABLE IF NOT EXISTS public.tmp_guc_probe(id serial primary key, note text, val text, created_at timestamptz default now());
GRANT ALL ON public.tmp_guc_probe TO service_role;
ALTER TABLE public.tmp_guc_probe ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.tmp_guc_inner() RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN RETURN COALESCE(current_setting('agrigrid.finance_share_org', true), '<unset>'); END $$;

CREATE OR REPLACE FUNCTION public.tmp_guc_outer() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM set_config('agrigrid.finance_share_org', 'PROBE-VALUE', true);
  INSERT INTO public.tmp_guc_probe(note, val) VALUES ('inner', public.tmp_guc_inner());
  INSERT INTO public.tmp_guc_probe(note, val) VALUES ('direct', COALESCE(current_setting('agrigrid.finance_share_org', true), '<unset>'));
END $$;

DO $$ BEGIN PERFORM public.tmp_guc_outer(); END $$;