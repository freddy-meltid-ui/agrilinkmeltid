-- AGRI-GRID V2 — Phase 1D regression suite (run before/after every later phase).
--
-- Covers the backend contract that Phase 1E builds on:
--   1. deterministic matching still returns rows and classifies near-matches;
--   2. blocking reasons are still produced for non-eligible candidates;
--   3. v2_request_supply_reconfirmation succeeds — this is the regression for the
--      "column status is of type v2_reconfirmation_status but expression is of type
--      text" enum-casting bug fixed in Phase 1D;
--   4. the created task is auto-assigned to the supplier's active field agent;
--   5. processor privacy holds: the commercial feed never exposes supplier identity,
--      phone or exact GPS.
--
-- Every assertion raises an exception on failure. All writes are undone at the end.
DO $$
DECLARE
  _req         public.v2_sourcing_requests%ROWTYPE;
  _member      uuid;
  _supply      uuid;
  _task        uuid;
  _task_row    public.v2_reconfirmation_tasks%ROWTYPE;
  _matches     int;
  _near        int;
  _blocking    int;
  _bad_cols    int;
BEGIN
  SELECT * INTO _req FROM public.v2_sourcing_requests ORDER BY created_at DESC LIMIT 1;
  IF _req.id IS NULL THEN RAISE EXCEPTION 'FIXTURE: no sourcing request available'; END IF;

  SELECT user_id INTO _member
  FROM public.v2_organization_members WHERE organization_id = _req.organization_id LIMIT 1;

  -- impersonate the processor member so auth.uid() resolves inside the RPCs
  PERFORM set_config('request.jwt.claims', json_build_object('sub', _member, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);

  -- 1 + 2. matching
  SELECT count(*) FILTER (WHERE match_class = 'match'),
         count(*) FILTER (WHERE match_class = 'near_match'),
         count(*) FILTER (WHERE match_class = 'near_match' AND cardinality(blocking_reasons) > 0)
    INTO _matches, _near, _blocking
  FROM public.v2_sourcing_matches(_req.id);

  IF _matches = 0 THEN RAISE EXCEPTION 'REGRESSION: matching returned no primary match'; END IF;
  IF _near > 0 AND _blocking <> _near THEN
    RAISE EXCEPTION 'REGRESSION: % near-matches without blocking reasons', _near - _blocking;
  END IF;

  SELECT supply_id INTO _supply FROM public.v2_sourcing_matches(_req.id)
  WHERE match_class = 'match' ORDER BY score DESC LIMIT 1;

  -- 5. privacy: the commercial feed is anonymised
  SELECT count(*) INTO _bad_cols
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name IN ('v2_commercial_supply')
    AND column_name IN ('phone', 'display_name', 'latitude', 'longitude', 'notes');
  IF _bad_cols > 0 THEN RAISE EXCEPTION 'REGRESSION: commercial feed exposes private columns'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.v2_commercial_supply(_req.facility_id, _req.crop_id)
    WHERE supplier_ref ILIKE '%' || (SELECT display_name FROM public.v2_suppliers LIMIT 1) || '%'
  ) THEN
    RAISE EXCEPTION 'REGRESSION: supplier display name leaked into the commercial feed';
  END IF;

  -- 3. reconfirmation RPC (enum-cast regression)
  _task := public.v2_request_supply_reconfirmation(_req.id, _supply, 'phase1d regression test', 'high', NULL);
  IF _task IS NULL THEN RAISE EXCEPTION 'REGRESSION: reconfirmation task not created'; END IF;

  SELECT * INTO _task_row FROM public.v2_reconfirmation_tasks WHERE id = _task;
  IF _task_row.status NOT IN ('open', 'assigned') THEN
    RAISE EXCEPTION 'REGRESSION: unexpected task status %', _task_row.status;
  END IF;

  -- 4. automatic field-agent assignment when the supplier has an active agent
  IF EXISTS (
    SELECT 1 FROM public.v2_supplier_assignments a
    JOIN public.v2_field_agents fa ON fa.id = a.field_agent_id AND fa.status = 'active'
    WHERE a.supplier_id = _task_row.supplier_id
  ) AND (_task_row.field_agent_id IS NULL OR _task_row.status <> 'assigned') THEN
    RAISE EXCEPTION 'REGRESSION: task was not auto-assigned to the supplier field agent';
  END IF;

  -- cleanup
  PERFORM set_config('role', 'postgres', true);
  DELETE FROM public.v2_reconfirmation_tasks WHERE id = _task;
  DELETE FROM public.v2_sourcing_events
   WHERE sourcing_request_id = _req.id AND payload->>'task_id' = _task::text;

  RAISE NOTICE 'PHASE 1D REGRESSION OK — % matches, % near-matches, task % assigned to agent %',
    _matches, _near, _task, _task_row.field_agent_id;
END $$;
