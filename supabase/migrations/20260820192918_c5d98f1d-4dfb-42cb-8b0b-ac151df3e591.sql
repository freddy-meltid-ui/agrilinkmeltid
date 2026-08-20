-- Phase 2B cleanup 1/2: consistent authorization contract for expense analytics
CREATE OR REPLACE FUNCTION public.v2_expense_breakdown(_organization_id uuid, _from date, _to date)
RETURNS TABLE(category v2_expense_category, total numeric, paid numeric, entries integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.v2_is_org_member(_organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid())) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  RETURN QUERY
  SELECT e.category, round(sum(e.amount),2),
         round(sum(CASE WHEN e.payment_status = 'paid' THEN e.amount ELSE 0 END),2), count(*)::int
  FROM public.v2_expenses e
  WHERE e.organization_id = _organization_id AND e.expense_date BETWEEN _from AND _to
  GROUP BY e.category ORDER BY 2 DESC;
END $function$;

REVOKE ALL ON FUNCTION public.v2_expense_breakdown(uuid, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v2_expense_breakdown(uuid, date, date) TO authenticated, service_role;

-- Phase 2B cleanup 2/2: single authoritative definition of an "active" sales order.
CREATE OR REPLACE FUNCTION public.v2_sales_active_statuses()
RETURNS v2_sales_status[]
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT ARRAY['draft','confirmed','partially_fulfilled']::v2_sales_status[]
$function$;

REVOKE ALL ON FUNCTION public.v2_sales_active_statuses() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v2_sales_active_statuses() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.v2_sales_order_kpis(_organization_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _r jsonb;
BEGIN
  IF NOT (public.v2_is_org_member(_organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid())) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  SELECT jsonb_build_object(
    'active_orders',  count(*) FILTER (WHERE status = ANY (public.v2_sales_active_statuses())),
    'fulfilled_orders', count(*) FILTER (WHERE status = 'fulfilled'),
    'cancelled_orders', count(*) FILTER (WHERE status = 'cancelled'),
    'sales_recorded', COALESCE(round(sum(total_amount) FILTER (WHERE status <> 'cancelled'),2),0),
    'cash_collected', COALESCE(round(sum(paid_amount) FILTER (WHERE status <> 'cancelled'),2),0)
  ) INTO _r
  FROM public.v2_sales_orders WHERE organization_id = _organization_id;
  RETURN _r;
END $function$;

REVOKE ALL ON FUNCTION public.v2_sales_order_kpis(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v2_sales_order_kpis(uuid) TO authenticated, service_role;