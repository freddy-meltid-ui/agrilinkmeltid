CREATE OR REPLACE FUNCTION public.v2_set_customer_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.customer_code IS NULL OR btrim(NEW.customer_code) = '' THEN
    NEW.customer_code := public.v2_next_reference('CUS');
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.v2_set_customer_code() FROM PUBLIC, anon, authenticated;