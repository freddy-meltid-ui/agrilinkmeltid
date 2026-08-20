DROP FUNCTION IF EXISTS public.tmp_guc_outer();
DROP FUNCTION IF EXISTS public.tmp_guc_inner();
DROP TABLE IF EXISTS public.tmp_guc_probe;

DO $mig$
DECLARE d text; d2 text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO d FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'v2_finance_readiness';
  -- v2_compliance_readiness keeps its own membership guard; through a share link the
  -- caller is anonymous, so treat an authorization failure there as "no compliance data"
  -- instead of failing the whole finance readiness computation.
  d2 := regexp_replace(
    d,
    'public\.v2_compliance_readiness\(([^;]*?)\)',
    '(SELECT public.v2_compliance_readiness_safe(\1))',
    'g');
  IF d2 = d THEN RAISE EXCEPTION 'compliance call not found in v2_finance_readiness'; END IF;

  EXECUTE $fn$
    CREATE OR REPLACE FUNCTION public.v2_compliance_readiness_safe(_organization_id uuid, _org_program_id uuid DEFAULT NULL)
    RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $body$
    BEGIN
      RETURN public.v2_compliance_readiness(_organization_id, _org_program_id);
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END $body$;
  $fn$;
  REVOKE ALL ON FUNCTION public.v2_compliance_readiness_safe(uuid, uuid) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.v2_compliance_readiness_safe(uuid, uuid) TO authenticated, anon, service_role;

  EXECUTE d2;
END $mig$;