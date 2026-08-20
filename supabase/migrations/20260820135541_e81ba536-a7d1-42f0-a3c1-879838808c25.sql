-- ============ Phase 1D: sourcing requests & deterministic matching ============

CREATE TYPE public.v2_sourcing_status AS ENUM (
  'draft','open','matching','reviewing','ready_for_confirmation',
  'partially_covered','covered','cancelled','expired'
);

CREATE TYPE public.v2_reconfirmation_status AS ENUM (
  'open','assigned','in_progress','confirmed','not_available','completed','cancelled'
);

-- ---------- sourcing requests ----------
CREATE TABLE public.v2_sourcing_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES public.v2_processing_facilities(id) ON DELETE SET NULL,
  reference text NOT NULL DEFAULT ('SR-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6))),
  crop_id uuid NOT NULL REFERENCES public.v2_crops(id),
  variety_id uuid REFERENCES public.v2_crop_varieties(id),
  variety_flexible boolean NOT NULL DEFAULT true,
  requested_quantity numeric NOT NULL CHECK (requested_quantity > 0),
  unit_code text NOT NULL DEFAULT 't',
  min_quantity_per_supplier numeric,
  max_quantity_per_supplier numeric,
  availability_start date NOT NULL,
  availability_end date NOT NULL,
  max_distance_km numeric,
  strict_radius boolean NOT NULL DEFAULT false,
  target_price numeric,
  price_unit text,
  quality_requirement text,
  certification_requirement text,
  certification_mandatory boolean NOT NULL DEFAULT false,
  packaging_requirement text,
  notes text,
  status public.v2_sourcing_status NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (availability_end >= availability_start)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_sourcing_requests TO authenticated;
GRANT ALL ON public.v2_sourcing_requests TO service_role;
ALTER TABLE public.v2_sourcing_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read sourcing requests"
  ON public.v2_sourcing_requests FOR SELECT TO authenticated
  USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()));

CREATE POLICY "org members create sourcing requests"
  ON public.v2_sourcing_requests FOR INSERT TO authenticated
  WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "org members update sourcing requests"
  ON public.v2_sourcing_requests FOR UPDATE TO authenticated
  USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()))
  WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()));

CREATE POLICY "org admins delete draft sourcing requests"
  ON public.v2_sourcing_requests FOR DELETE TO authenticated
  USING (public.v2_is_org_admin(organization_id, auth.uid()) AND status = 'draft');

CREATE TRIGGER update_v2_sourcing_requests_updated_at
  BEFORE UPDATE ON public.v2_sourcing_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_v2_sourcing_requests_org ON public.v2_sourcing_requests(organization_id, status);
CREATE INDEX idx_v2_sourcing_requests_crop ON public.v2_sourcing_requests(crop_id, availability_start, availability_end);

-- ---------- matching run snapshots ----------
CREATE TABLE public.v2_sourcing_match_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sourcing_request_id uuid NOT NULL REFERENCES public.v2_sourcing_requests(id) ON DELETE CASCADE,
  requested_tonnes numeric,
  identified_tonnes numeric,
  high_confidence_tonnes numeric,
  coverage_ratio numeric,
  match_count integer NOT NULL DEFAULT 0,
  near_match_count integer NOT NULL DEFAULT 0,
  supplier_count integer NOT NULL DEFAULT 0,
  weighted_avg_distance_km numeric,
  recommended_set jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.v2_sourcing_match_runs TO authenticated;
GRANT ALL ON public.v2_sourcing_match_runs TO service_role;
ALTER TABLE public.v2_sourcing_match_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read match runs"
  ON public.v2_sourcing_match_runs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.v2_sourcing_requests r
    WHERE r.id = sourcing_request_id
      AND (public.v2_is_org_member(r.organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()))
  ));

CREATE POLICY "org members insert match runs"
  ON public.v2_sourcing_match_runs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.v2_sourcing_requests r
    WHERE r.id = sourcing_request_id
      AND (public.v2_is_org_member(r.organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()))
  ));

CREATE INDEX idx_v2_match_runs_request ON public.v2_sourcing_match_runs(sourcing_request_id, created_at DESC);

-- ---------- reconfirmation tasks ----------
CREATE TABLE public.v2_reconfirmation_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sourcing_request_id uuid REFERENCES public.v2_sourcing_requests(id) ON DELETE SET NULL,
  supplier_id uuid NOT NULL REFERENCES public.v2_suppliers(id) ON DELETE CASCADE,
  supply_id uuid REFERENCES public.v2_supply_availability(id) ON DELETE SET NULL,
  crop_cycle_id uuid REFERENCES public.v2_crop_cycles(id) ON DELETE SET NULL,
  crop_id uuid REFERENCES public.v2_crops(id),
  field_agent_id uuid REFERENCES public.v2_field_agents(id) ON DELETE SET NULL,
  reason text,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  needed_by date,
  due_date date,
  status public.v2_reconfirmation_status NOT NULL DEFAULT 'open',
  result_quantity numeric,
  result_unit_code text,
  result_available_start date,
  result_available_end date,
  result_quality_grade text,
  result_asking_price numeric,
  observation text,
  completed_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.v2_reconfirmation_tasks TO authenticated;
GRANT ALL ON public.v2_reconfirmation_tasks TO service_role;
ALTER TABLE public.v2_reconfirmation_tasks ENABLE ROW LEVEL SECURITY;

-- Field agents see tasks assigned to them; Agri-Grid admins see all.
-- Processors do NOT read this table (it references internal supplier identities).
CREATE POLICY "agents and admins read reconfirmation tasks"
  ON public.v2_reconfirmation_tasks FOR SELECT TO authenticated
  USING (
    public.v2_is_agrigrid_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.v2_field_agents fa
      WHERE fa.id = field_agent_id AND fa.user_id = auth.uid() AND fa.status = 'active'
    )
  );

CREATE POLICY "admins create reconfirmation tasks"
  ON public.v2_reconfirmation_tasks FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (public.v2_is_agrigrid_admin(auth.uid()) OR public.v2_is_field_agent(auth.uid()))
  );

CREATE POLICY "assigned agents and admins update reconfirmation tasks"
  ON public.v2_reconfirmation_tasks FOR UPDATE TO authenticated
  USING (
    public.v2_is_agrigrid_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.v2_field_agents fa
      WHERE fa.id = field_agent_id AND fa.user_id = auth.uid() AND fa.status = 'active'
    )
  )
  WITH CHECK (
    public.v2_is_agrigrid_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.v2_field_agents fa
      WHERE fa.id = field_agent_id AND fa.user_id = auth.uid() AND fa.status = 'active'
    )
  );

CREATE TRIGGER update_v2_reconfirmation_tasks_updated_at
  BEFORE UPDATE ON public.v2_reconfirmation_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_v2_reconf_agent ON public.v2_reconfirmation_tasks(field_agent_id, status);
CREATE INDEX idx_v2_reconf_request ON public.v2_reconfirmation_tasks(sourcing_request_id);

-- ---------- sourcing events (append-only audit) ----------
CREATE TABLE public.v2_sourcing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sourcing_request_id uuid NOT NULL REFERENCES public.v2_sourcing_requests(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.v2_sourcing_events TO authenticated;
GRANT ALL ON public.v2_sourcing_events TO service_role;
ALTER TABLE public.v2_sourcing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read sourcing events"
  ON public.v2_sourcing_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.v2_sourcing_requests r
    WHERE r.id = sourcing_request_id
      AND (public.v2_is_org_member(r.organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()))
  ));

CREATE POLICY "org members write sourcing events"
  ON public.v2_sourcing_events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.v2_sourcing_requests r
    WHERE r.id = sourcing_request_id
      AND (public.v2_is_org_member(r.organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()))
  ));

CREATE INDEX idx_v2_sourcing_events_request ON public.v2_sourcing_events(sourcing_request_id, created_at DESC);

-- ---------- configurable scoring weights ----------
INSERT INTO public.v2_settings (key, value, description)
VALUES (
  'sourcing_match_weights',
  '{"product":30,"availability":20,"distance":20,"freshness":15,"confidence":10,"quality":5,"soft_radius_factor":1.5}'::jsonb,
  'Phase 1D deterministic matching weights (total 100) and the tolerance factor used to surface near-matches outside the requested radius.'
)
ON CONFLICT (key) DO NOTHING;

-- performance indexes for database-side matching
CREATE INDEX IF NOT EXISTS idx_v2_supply_crop_status ON public.v2_supply_availability(crop_id, status);
CREATE INDEX IF NOT EXISTS idx_v2_supply_window ON public.v2_supply_availability(availability_start, availability_end);
CREATE INDEX IF NOT EXISTS idx_v2_suppliers_active ON public.v2_suppliers(is_active, status);

-- ============================ MATCHING ENGINE ============================
CREATE OR REPLACE FUNCTION public.v2_sourcing_matches(_request_id uuid)
RETURNS TABLE(
  supply_id uuid,
  supplier_ref text,
  supplier_type text,
  supplier_status text,
  crop_id uuid,
  crop_name_fr text,
  crop_name_en text,
  variety_id uuid,
  variety_name_fr text,
  variety_name_en text,
  quantity_tonnes numeric,
  quantity numeric,
  unit_code text,
  availability_start date,
  availability_end date,
  overlap_days integer,
  distance_km numeric,
  freshness text,
  confidence text,
  verification_status text,
  quality_grade text,
  certification_status text,
  supply_status text,
  last_confirmed_at timestamptz,
  department text,
  commune text,
  approx_latitude numeric,
  approx_longitude numeric,
  match_class text,
  score numeric,
  score_breakdown jsonb,
  reasons jsonb,
  blocking_reasons text[]
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH req AS (
    SELECT r.*
    FROM public.v2_sourcing_requests r
    WHERE r.id = _request_id
      AND (public.v2_is_org_member(r.organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()))
  ),
  w AS (
    SELECT
      COALESCE((value->>'product')::numeric, 30)  AS w_product,
      COALESCE((value->>'availability')::numeric, 20) AS w_avail,
      COALESCE((value->>'distance')::numeric, 20) AS w_dist,
      COALESCE((value->>'freshness')::numeric, 15) AS w_fresh,
      COALESCE((value->>'confidence')::numeric, 10) AS w_conf,
      COALESCE((value->>'quality')::numeric, 5) AS w_qual,
      COALESCE((value->>'soft_radius_factor')::numeric, 1.5) AS soft_factor
    FROM public.v2_settings WHERE key = 'sourcing_match_weights'
  ),
  weights AS (
    SELECT * FROM w
    UNION ALL
    SELECT 30,20,20,15,10,5,1.5 WHERE NOT EXISTS (SELECT 1 FROM w)
  ),
  facility AS (
    SELECT f.latitude AS lat, f.longitude AS lng
    FROM public.v2_processing_facilities f
    JOIN req ON req.facility_id = f.id
  ),
  cand AS (
    SELECT
      sa.id AS supply_id,
      s.id  AS supplier_id,
      CASE
        WHEN s.supplier_type::text = 'cooperative'
          THEN 'Coopérative ' || CASE WHEN s.status::text = 'field_verified' THEN 'vérifiée' ELSE 'enregistrée' END || ' ' || s.supplier_code
        ELSE 'Producteur ' || CASE WHEN s.status::text = 'field_verified' THEN 'vérifié' ELSE 'enregistré' END || ' ' || s.supplier_code
      END AS supplier_ref,
      s.supplier_type::text AS supplier_type,
      s.status::text        AS supplier_status,
      sa.crop_id, c.name_fr AS crop_name_fr, c.name_en AS crop_name_en,
      sa.variety_id, v.name_fr AS variety_name_fr, v.name_en AS variety_name_en,
      public.v2_to_tonnes(sa.quantity_available, sa.unit_code) AS quantity_tonnes,
      sa.quantity_available AS quantity,
      sa.unit_code,
      sa.availability_start, sa.availability_end,
      GREATEST(0, (
        LEAST(COALESCE(sa.availability_end, req.availability_end), req.availability_end)
        - GREATEST(COALESCE(sa.availability_start, req.availability_start), req.availability_start)
      ) + 1)::int AS overlap_days,
      (req.availability_end - req.availability_start + 1)::int AS requested_days,
      public.v2_distance_km((SELECT lat FROM facility), (SELECT lng FROM facility), s.latitude, s.longitude) AS distance_km,
      public.v2_freshness_status(COALESCE(sa.last_confirmed_at, sa.updated_at)) AS freshness,
      sa.quality_grade, sa.certification_status, sa.status::text AS supply_status,
      sa.last_confirmed_at,
      s.department, s.commune,
      public.v2_approx_coord(s.latitude) AS approx_latitude,
      public.v2_approx_coord(s.longitude) AS approx_longitude,
      req.variety_id AS req_variety_id,
      req.variety_flexible,
      req.max_distance_km,
      req.strict_radius,
      req.quality_requirement,
      req.certification_requirement,
      req.certification_mandatory
    FROM req
    JOIN public.v2_supply_availability sa ON sa.crop_id = req.crop_id
    JOIN public.v2_suppliers s ON s.id = sa.supplier_id AND s.is_active
    JOIN public.v2_crops c ON c.id = sa.crop_id
    LEFT JOIN public.v2_crop_varieties v ON v.id = sa.variety_id
    WHERE sa.status IN ('available','expected','forecast')
  ),
  scored AS (
    SELECT cand.*,
      public.v2_supply_confidence(
        cand.supplier_status, cand.freshness, cand.supply_status, cand.last_confirmed_at,
        cand.variety_id IS NOT NULL, cand.availability_start IS NOT NULL
      ) AS confidence,
      CASE WHEN cand.supplier_status = 'field_verified' THEN 'field_verified' ELSE 'unverified' END AS verification_status,
      -- product compatibility 0..1
      CASE
        WHEN cand.req_variety_id IS NULL THEN 1
        WHEN cand.variety_id = cand.req_variety_id THEN 1
        WHEN cand.variety_id IS NULL THEN 0.6
        ELSE 0.3
      END AS f_product,
      -- availability overlap 0..1
      LEAST(1, cand.overlap_days::numeric / NULLIF(cand.requested_days, 0)) AS f_avail,
      -- distance 0..1 relative to the requested radius (or 100 km default)
      CASE
        WHEN cand.distance_km IS NULL THEN 0.4
        ELSE GREATEST(0, 1 - (cand.distance_km / NULLIF(COALESCE(cand.max_distance_km, 100), 0)))
      END AS f_dist,
      CASE cand.freshness WHEN 'fresh' THEN 1 WHEN 'aging' THEN 0.6 ELSE 0.2 END AS f_fresh,
      CASE public.v2_supply_confidence(
        cand.supplier_status, cand.freshness, cand.supply_status, cand.last_confirmed_at,
        cand.variety_id IS NOT NULL, cand.availability_start IS NOT NULL)
        WHEN 'high' THEN 1 WHEN 'medium' THEN 0.6 ELSE 0.3 END AS f_conf,
      CASE
        WHEN cand.quality_requirement IS NULL THEN 1
        WHEN cand.quality_grade IS NULL THEN 0.5
        WHEN lower(cand.quality_grade) = lower(cand.quality_requirement) THEN 1
        ELSE 0.3
      END AS f_qual
    FROM cand
  ),
  classified AS (
    SELECT sc.*,
      (SELECT soft_factor FROM weights LIMIT 1) AS soft_factor,
      ARRAY_REMOVE(ARRAY[
        CASE WHEN sc.overlap_days <= 0 THEN 'no_window_overlap' END,
        CASE WHEN COALESCE(sc.quantity_tonnes, 0) <= 0 THEN 'no_quantity' END,
        CASE WHEN sc.max_distance_km IS NOT NULL AND sc.strict_radius
                  AND (sc.distance_km IS NULL OR sc.distance_km > sc.max_distance_km)
             THEN 'outside_strict_radius' END,
        CASE WHEN sc.certification_mandatory AND sc.certification_requirement IS NOT NULL
                  AND COALESCE(lower(sc.certification_status), '') <> lower(sc.certification_requirement)
             THEN 'missing_required_certification' END,
        CASE WHEN sc.req_variety_id IS NOT NULL AND NOT sc.variety_flexible
                  AND (sc.variety_id IS NULL OR sc.variety_id <> sc.req_variety_id)
             THEN 'variety_mismatch' END,
        CASE WHEN sc.max_distance_km IS NOT NULL AND NOT sc.strict_radius
                  AND sc.distance_km IS NOT NULL
                  AND sc.distance_km > sc.max_distance_km * (SELECT soft_factor FROM weights LIMIT 1)
             THEN 'far_outside_radius' END,
        CASE WHEN sc.freshness = 'needs_verification' THEN 'stale_data' END
      ], NULL) AS blocking_reasons
    FROM scored sc
  ),
  final AS (
    SELECT cl.*,
      round((
        (SELECT w_product FROM weights LIMIT 1) * cl.f_product +
        (SELECT w_avail   FROM weights LIMIT 1) * COALESCE(cl.f_avail, 0) +
        (SELECT w_dist    FROM weights LIMIT 1) * cl.f_dist +
        (SELECT w_fresh   FROM weights LIMIT 1) * cl.f_fresh +
        (SELECT w_conf    FROM weights LIMIT 1) * cl.f_conf +
        (SELECT w_qual    FROM weights LIMIT 1) * cl.f_qual
      ), 1) AS score
    FROM classified cl
  )
  SELECT
    f.supply_id, f.supplier_ref, f.supplier_type, f.supplier_status,
    f.crop_id, f.crop_name_fr, f.crop_name_en,
    f.variety_id, f.variety_name_fr, f.variety_name_en,
    f.quantity_tonnes, f.quantity, f.unit_code,
    f.availability_start, f.availability_end, f.overlap_days,
    f.distance_km, f.freshness, f.confidence, f.verification_status,
    f.quality_grade, f.certification_status, f.supply_status, f.last_confirmed_at,
    f.department, f.commune, f.approx_latitude, f.approx_longitude,
    CASE WHEN cardinality(f.blocking_reasons) = 0 THEN 'match' ELSE 'near_match' END AS match_class,
    f.score,
    jsonb_build_object(
      'product', round(f.f_product, 2),
      'availability', round(COALESCE(f.f_avail, 0), 2),
      'distance', round(f.f_dist, 2),
      'freshness', round(f.f_fresh, 2),
      'confidence', round(f.f_conf, 2),
      'quality', round(f.f_qual, 2)
    ) AS score_breakdown,
    jsonb_build_array(
      jsonb_build_object('code','variety','ok', f.f_product >= 1,
        'value', COALESCE(f.variety_name_fr, f.crop_name_fr)),
      jsonb_build_object('code','window','ok', f.overlap_days > 0, 'value', f.overlap_days),
      jsonb_build_object('code','distance','ok',
        f.distance_km IS NOT NULL AND (f.max_distance_km IS NULL OR f.distance_km <= f.max_distance_km),
        'value', f.distance_km),
      jsonb_build_object('code','freshness','ok', f.freshness = 'fresh', 'value', f.freshness,
        'confirmed_at', f.last_confirmed_at),
      jsonb_build_object('code','confidence','ok', f.confidence = 'high', 'value', f.confidence),
      jsonb_build_object('code','quantity','ok', true, 'value', f.quantity_tonnes),
      jsonb_build_object('code','quality','ok', f.f_qual >= 1, 'value', f.quality_grade),
      jsonb_build_object('code','certification','ok',
        NOT f.certification_mandatory
        OR COALESCE(lower(f.certification_status),'') = lower(COALESCE(f.certification_requirement,'')),
        'value', f.certification_status)
    ) AS reasons,
    f.blocking_reasons
  FROM final f
  ORDER BY (CASE WHEN cardinality(f.blocking_reasons) = 0 THEN 0 ELSE 1 END), f.score DESC, f.distance_km NULLS LAST
$function$;

REVOKE ALL ON FUNCTION public.v2_sourcing_matches(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v2_sourcing_matches(uuid) TO authenticated, service_role;

-- ==================== ADMIN DEMAND INTELLIGENCE ====================
CREATE OR REPLACE FUNCTION public.v2_sourcing_demand_intelligence()
RETURNS TABLE(
  crop_id uuid,
  crop_name_fr text,
  crop_name_en text,
  period_month date,
  department text,
  request_count bigint,
  demand_tonnes numeric,
  identified_tonnes numeric,
  gap_tonnes numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH guard AS (SELECT public.v2_is_agrigrid_admin(auth.uid()) AS ok),
  demand AS (
    SELECT r.crop_id,
           date_trunc('month', r.availability_start)::date AS period_month,
           COALESCE(fac.department, o.region) AS department,
           count(*) AS request_count,
           sum(public.v2_to_tonnes(r.requested_quantity, r.unit_code)) AS demand_tonnes
    FROM public.v2_sourcing_requests r
    JOIN public.v2_organizations o ON o.id = r.organization_id
    LEFT JOIN public.v2_processing_facilities fac ON fac.id = r.facility_id
    WHERE (SELECT ok FROM guard)
      AND r.status NOT IN ('draft','cancelled','expired')
    GROUP BY 1,2,3
  ),
  supply AS (
    SELECT sa.crop_id,
           date_trunc('month', COALESCE(sa.availability_start, current_date))::date AS period_month,
           s.department,
           sum(public.v2_to_tonnes(sa.quantity_available, sa.unit_code)) AS identified_tonnes
    FROM public.v2_supply_availability sa
    JOIN public.v2_suppliers s ON s.id = sa.supplier_id AND s.is_active
    WHERE (SELECT ok FROM guard) AND sa.status IN ('available','expected','forecast')
    GROUP BY 1,2,3
  )
  SELECT d.crop_id, c.name_fr, c.name_en, d.period_month, d.department,
         d.request_count,
         round(COALESCE(d.demand_tonnes, 0), 2),
         round(COALESCE(sp.identified_tonnes, 0), 2),
         round(GREATEST(0, COALESCE(d.demand_tonnes, 0) - COALESCE(sp.identified_tonnes, 0)), 2)
  FROM demand d
  JOIN public.v2_crops c ON c.id = d.crop_id
  LEFT JOIN supply sp ON sp.crop_id = d.crop_id AND sp.period_month = d.period_month
                     AND COALESCE(sp.department,'') = COALESCE(d.department,'')
  ORDER BY d.period_month, c.name_fr
$function$;

REVOKE ALL ON FUNCTION public.v2_sourcing_demand_intelligence() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v2_sourcing_demand_intelligence() TO authenticated, service_role;

-- ==================== FIELD AGENT TASK FEED (privacy-safe join) ====================
CREATE OR REPLACE FUNCTION public.v2_reconfirmation_task_feed()
RETURNS TABLE(
  task_id uuid,
  supplier_id uuid,
  supplier_name text,
  supplier_code text,
  commune text,
  crop_id uuid,
  crop_name_fr text,
  crop_name_en text,
  supply_id uuid,
  current_quantity numeric,
  current_unit text,
  reason text,
  priority text,
  needed_by date,
  due_date date,
  status text,
  last_confirmed_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT t.id, s.id, s.display_name, s.supplier_code, s.commune,
         t.crop_id, c.name_fr, c.name_en,
         t.supply_id, sa.quantity_available, sa.unit_code,
         t.reason, t.priority, t.needed_by, t.due_date, t.status::text,
         sa.last_confirmed_at, t.created_at
  FROM public.v2_reconfirmation_tasks t
  JOIN public.v2_suppliers s ON s.id = t.supplier_id
  LEFT JOIN public.v2_crops c ON c.id = t.crop_id
  LEFT JOIN public.v2_supply_availability sa ON sa.id = t.supply_id
  WHERE public.v2_is_agrigrid_admin(auth.uid())
     OR EXISTS (
       SELECT 1 FROM public.v2_field_agents fa
       WHERE fa.id = t.field_agent_id AND fa.user_id = auth.uid() AND fa.status = 'active'
     )
  ORDER BY
    CASE t.status WHEN 'open' THEN 0 WHEN 'assigned' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END,
    CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
    t.due_date NULLS LAST
$function$;

REVOKE ALL ON FUNCTION public.v2_reconfirmation_task_feed() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v2_reconfirmation_task_feed() TO authenticated, service_role;