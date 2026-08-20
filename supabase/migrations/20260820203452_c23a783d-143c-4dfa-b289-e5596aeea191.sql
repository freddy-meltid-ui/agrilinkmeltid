CREATE OR REPLACE FUNCTION public.v2_finance_can_read(_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  -- NULL-safe: every branch is coerced to a boolean. The previous version could
  -- evaluate to NULL (unset share GUC + NULL auth.uid()), and "IF NOT NULL" does
  -- not raise, which silently granted access.
  SELECT COALESCE(
    (auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.v2_organization_members
         WHERE organization_id = _organization_id AND user_id = auth.uid())),
    false)
  OR COALESCE(
    (auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.v2_organization_members
         WHERE user_id = auth.uid() AND role = 'agrigrid_admin')),
    false)
  OR COALESCE(
    NULLIF(current_setting('agrigrid.finance_share_org', true), '') = _organization_id::text,
    false)
$function$;

REVOKE ALL ON FUNCTION public.v2_finance_can_read(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.v2_finance_can_read(uuid) TO authenticated, anon, service_role;