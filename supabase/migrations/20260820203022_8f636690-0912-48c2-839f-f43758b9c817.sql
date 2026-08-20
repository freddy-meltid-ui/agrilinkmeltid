DO $mig$
DECLARE d text; d0 text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO d0 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'v2_finance_readiness';
  -- jsonb_build_object stores a missing request as the JSON value 'null', which is NOT
  -- SQL NULL, so the qualifier never fired. Test the JSON type instead.
  d := replace(d0,
'  IF _snap->''financing_request'' IS NULL THEN',
'  IF _snap->''financing_request'' IS NULL OR jsonb_typeof(_snap->''financing_request'') = ''null'' THEN');
  IF d = d0 THEN RAISE EXCEPTION 'qualifier patch did not apply'; END IF;
  EXECUTE d;
END $mig$;