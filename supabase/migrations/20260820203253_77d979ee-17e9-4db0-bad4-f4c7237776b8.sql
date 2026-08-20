DO $mig$
DECLARE r record; d text; d2 text;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('v2_create_finance_share','v2_finance_shared_dossier','v2_revoke_finance_share')
  LOOP
    d := pg_get_functiondef(r.oid);
    d2 := d;
    -- pgcrypto lives in the "extensions" schema, which is not in these functions'
    -- search_path, so the unqualified calls failed at runtime.
    d2 := regexp_replace(d2, '([^.\w])gen_random_bytes\(', '\1extensions.gen_random_bytes(', 'g');
    d2 := regexp_replace(d2, '([^.\w])digest\(', '\1extensions.digest(', 'g');
    IF d2 <> d THEN EXECUTE d2; RAISE NOTICE 'patched %', r.proname; END IF;
  END LOOP;
END $mig$;