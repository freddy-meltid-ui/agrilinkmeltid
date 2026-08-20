CREATE OR REPLACE FUNCTION public.v2_request_supply_reconfirmation(_request_id uuid, _supply_id uuid, _reason text DEFAULT NULL::text, _priority text DEFAULT 'high'::text, _due_date date DEFAULT NULL::date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _org uuid;
  _needed date;
  _supplier uuid;
  _crop uuid;
  _cycle uuid;
  _agent uuid;
  _task uuid;
  _existing uuid;
BEGIN
  SELECT r.organization_id, r.availability_start INTO _org, _needed
  FROM public.v2_sourcing_requests r WHERE r.id = _request_id;

  IF _org IS NULL THEN
    RAISE EXCEPTION 'Sourcing request not found';
  END IF;

  IF NOT (public.v2_is_org_member(_org, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized for this sourcing request';
  END IF;

  SELECT sa.supplier_id, sa.crop_id, sa.crop_cycle_id INTO _supplier, _crop, _cycle
  FROM public.v2_supply_availability sa WHERE sa.id = _supply_id;

  IF _supplier IS NULL THEN
    RAISE EXCEPTION 'Supply record not found';
  END IF;

  SELECT t.id INTO _existing
  FROM public.v2_reconfirmation_tasks t
  WHERE t.sourcing_request_id = _request_id
    AND t.supply_id = _supply_id
    AND t.status IN ('open','assigned','in_progress');
  IF _existing IS NOT NULL THEN
    RETURN _existing;
  END IF;

  SELECT a.field_agent_id INTO _agent
  FROM public.v2_supplier_assignments a
  JOIN public.v2_field_agents fa ON fa.id = a.field_agent_id AND fa.status = 'active'
  WHERE a.supplier_id = _supplier
  ORDER BY a.is_primary DESC, a.created_at
  LIMIT 1;

  INSERT INTO public.v2_reconfirmation_tasks (
    sourcing_request_id, supplier_id, supply_id, crop_cycle_id, crop_id,
    field_agent_id, reason, priority, needed_by, due_date, status, created_by
  ) VALUES (
    _request_id, _supplier, _supply_id, _cycle, _crop,
    _agent, _reason, COALESCE(_priority, 'high'), _needed,
    COALESCE(_due_date, LEAST(_needed, current_date + 7)),
    (CASE WHEN _agent IS NULL THEN 'open' ELSE 'assigned' END)::public.v2_reconfirmation_status,
    auth.uid()
  )
  RETURNING id INTO _task;

  INSERT INTO public.v2_sourcing_events (sourcing_request_id, event_type, payload, actor_id)
  VALUES (_request_id, 'reconfirmation_requested',
          jsonb_build_object('supply_id', _supply_id, 'task_id', _task), auth.uid());

  RETURN _task;
END;
$function$;