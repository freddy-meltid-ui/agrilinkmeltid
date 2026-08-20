-- Read context for the finance engine. Membership or AgriGrid admin as usual, plus a
-- transaction-local share context that only v2_finance_shared_dossier can set after it
-- has validated a hashed, unexpired, unrevoked share token.
CREATE OR REPLACE FUNCTION public.v2_finance_can_read(_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT public.v2_is_org_member(_organization_id, auth.uid())
      OR public.v2_is_agrigrid_admin(auth.uid())
      OR NULLIF(current_setting('agrigrid.finance_share_org', true), '') = _organization_id::text
$function$;

REVOKE ALL ON FUNCTION public.v2_finance_can_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v2_finance_can_read(uuid) TO authenticated, service_role;
