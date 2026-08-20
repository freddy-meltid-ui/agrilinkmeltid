-- Phase 1E fix: tonnes physically received against a commitment must stay deducted
-- from commercial availability even after that commitment is released, cancelled or
-- expired (e.g. under-delivery closure). Otherwise already-delivered volume would be
-- offered again to other processors.
CREATE OR REPLACE FUNCTION public.v2_committed_tonnes(_supply_id uuid)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    -- active commercial reservations
    COALESCE((
      SELECT sum(c.confirmed_tonnes)
      FROM public.v2_supply_commitments c
      WHERE c.supply_id = _supply_id
        AND c.status IN ('confirmed','partially_confirmed','fulfilled')
    ), 0)
    -- plus volume already physically received under commitments that are no longer active
    + COALESCE((
      SELECT sum(gr.accepted_tonnes)
      FROM public.v2_goods_receipts gr
      JOIN public.v2_procurement_orders o ON o.id = gr.order_id
      JOIN public.v2_supply_commitments c2 ON c2.id = o.commitment_id
      WHERE c2.supply_id = _supply_id
        AND c2.status NOT IN ('confirmed','partially_confirmed','fulfilled')
    ), 0)
$function$;