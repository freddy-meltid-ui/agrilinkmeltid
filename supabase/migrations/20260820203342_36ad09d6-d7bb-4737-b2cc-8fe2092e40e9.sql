DO $mig$
DECLARE r record; d text; d2 text;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('v2_finance_snapshot','v2_finance_readiness','v2_finance_history','v2_finance_documents_status')
  LOOP
    d := pg_get_functiondef(r.oid);
    -- Route the membership gate through v2_finance_can_read so a transaction-local
    -- share context (set only by v2_finance_shared_dossier) also grants read access.
    d2 := replace(d,
      'IF NOT (public.v2_is_org_member(_organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid())) THEN',
      'IF NOT public.v2_finance_can_read(_organization_id) THEN');
    d2 := replace(d2,
      'IF NOT public.v2_is_org_member(_organization_id, auth.uid()) AND NOT public.v2_is_agrigrid_admin(auth.uid()) THEN',
      'IF NOT public.v2_finance_can_read(_organization_id) THEN');
    IF d2 <> d THEN EXECUTE d2; RAISE NOTICE 'patched %', r.proname;
    ELSE RAISE NOTICE 'no change %', r.proname; END IF;
  END LOOP;
END $mig$;