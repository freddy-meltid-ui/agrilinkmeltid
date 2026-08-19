ALTER FUNCTION public.v2_distance_km(numeric, numeric, numeric, numeric) SET search_path = public;
ALTER FUNCTION public.v2_approx_coord(numeric) SET search_path = public;
ALTER FUNCTION public.v2_supply_confidence(text, text, text, timestamptz, boolean, boolean) SET search_path = public;