-- =====================================================================
-- AGRI-GRID V2 — PHASE 1C : SUPPLY INTELLIGENCE (additive, V2 only)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Reference data corrections (additive)
-- ---------------------------------------------------------------------
UPDATE public.v2_units SET to_base_factor = 50 WHERE code = 'sac' AND to_base_factor IS NULL;

-- ---------------------------------------------------------------------
-- 1. Private field evidence : admins + active field agents may read
--    (processors are never granted anything on this bucket)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "field evidence read network" ON storage.objects;
CREATE POLICY "field evidence read network"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'field-evidence'
    AND (
      public.v2_is_agrigrid_admin(auth.uid())
      OR public.v2_is_field_agent(auth.uid())
    )
  );

-- ---------------------------------------------------------------------
-- 2. Deterministic helper layer
-- ---------------------------------------------------------------------

-- 2.1 unit normalisation -> tonnes (mass only, NULL when not convertible)
CREATE OR REPLACE FUNCTION public.v2_to_tonnes(_quantity numeric, _unit_code text)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _quantity IS NULL THEN NULL
    ELSE (
      SELECT CASE WHEN u.dimension = 'mass' AND u.to_base_factor IS NOT NULL
                  THEN round((_quantity * u.to_base_factor) / 1000.0, 3)
                  ELSE NULL END
      FROM public.v2_units u
      WHERE u.code = _unit_code
    )
  END
$$;

-- 2.2 geodesic (haversine) distance in km — approximate, straight line
CREATE OR REPLACE FUNCTION public.v2_distance_km(_lat1 numeric, _lng1 numeric, _lat2 numeric, _lng2 numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _lat1 IS NULL OR _lng1 IS NULL OR _lat2 IS NULL OR _lng2 IS NULL THEN NULL
    ELSE round((
      6371 * 2 * asin(sqrt(
        power(sin(radians(_lat2 - _lat1) / 2), 2)
        + cos(radians(_lat1)) * cos(radians(_lat2))
        * power(sin(radians(_lng2 - _lng1) / 2), 2)
      ))
    )::numeric, 1)
  END
$$;

-- 2.3 privacy-preserving coordinate (~2 km grid) for processor-facing maps
CREATE OR REPLACE FUNCTION public.v2_approx_coord(_value numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE WHEN _value IS NULL THEN NULL ELSE round(_value / 0.02) * 0.02 END
$$;

-- 2.4 freshness from timestamps + configurable thresholds
CREATE OR REPLACE FUNCTION public.v2_freshness_status(_reference timestamptz)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  cfg jsonb;
  fresh_max int;
  aging_max int;
  age_days numeric;
BEGIN
  IF _reference IS NULL THEN RETURN 'unknown'; END IF;
  SELECT value INTO cfg FROM public.v2_settings WHERE key = 'supply_freshness_thresholds';
  fresh_max := COALESCE((cfg->>'fresh_max_days')::int, 7);
  aging_max := COALESCE((cfg->>'aging_max_days')::int, 21);
  age_days := extract(epoch FROM (now() - _reference)) / 86400.0;
  IF age_days <= fresh_max THEN RETURN 'fresh';
  ELSIF age_days <= aging_max THEN RETURN 'aging';
  ELSE RETURN 'needs_verification';
  END IF;
END;
$$;

-- 2.5 supply confidence — deterministic, documented, no AI
--     high   : field-verified supplier + fresh confirmation + status available
--     medium : field-verified supplier + data not stale
--     low    : everything else (stale, unverified or incomplete record)
CREATE OR REPLACE FUNCTION public.v2_supply_confidence(
  _supplier_status text,
  _freshness text,
  _supply_status text,
  _confirmed_at timestamptz,
  _has_variety boolean,
  _has_window boolean
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _supplier_status = 'field_verified'
     AND _freshness = 'fresh'
     AND _supply_status = 'available'
     AND _confirmed_at IS NOT NULL
     AND _has_variety AND _has_window THEN 'high'
    WHEN _supplier_status = 'field_verified'
     AND _freshness IN ('fresh','aging')
     AND _supply_status IN ('available','expected') THEN 'medium'
    ELSE 'low'
  END
$$;

-- 2.6 who may consult commercial supply intelligence
CREATE OR REPLACE FUNCTION public.v2_can_read_commercial_supply(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id = auth.uid()
     AND (
       public.v2_is_agrigrid_admin(_user_id)
       OR EXISTS (
         SELECT 1
         FROM public.v2_organization_members m
         JOIN public.v2_organizations o ON o.id = m.organization_id
         WHERE m.user_id = _user_id
           AND o.org_type IN ('processor','cooperative','agrigrid')
       )
     )
$$;

-- ---------------------------------------------------------------------
-- 3. Commercial supply feed (processor-safe projection)
--    Internal fields (phone, identity, exact GPS, notes, photos) never leave.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.v2_commercial_supply(
  _facility_id uuid DEFAULT NULL,
  _crop_id uuid DEFAULT NULL,
  _variety_id uuid DEFAULT NULL,
  _department text DEFAULT NULL,
  _commune text DEFAULT NULL,
  _search text DEFAULT NULL,
  _freshness text[] DEFAULT NULL,
  _confidence text[] DEFAULT NULL,
  _min_quantity_t numeric DEFAULT NULL,
  _available_from date DEFAULT NULL,
  _available_to date DEFAULT NULL,
  _max_distance_km numeric DEFAULT NULL,
  _verified_only boolean DEFAULT false,
  _quality_grade text DEFAULT NULL,
  _limit int DEFAULT 100,
  _offset int DEFAULT 0
)
RETURNS TABLE (
  supply_id uuid,
  crop_id uuid,
  crop_code text,
  crop_name_fr text,
  crop_name_en text,
  variety_id uuid,
  variety_code text,
  variety_name_fr text,
  variety_name_en text,
  quantity numeric,
  unit_code text,
  quantity_tonnes numeric,
  availability_start date,
  availability_end date,
  quality_grade text,
  certification_status text,
  supply_status text,
  freshness text,
  confidence text,
  verification_status text,
  supplier_ref text,
  supplier_type text,
  department text,
  commune text,
  approx_latitude numeric,
  approx_longitude numeric,
  distance_km numeric,
  last_confirmed_at timestamptz,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH guard AS (
    SELECT public.v2_can_read_commercial_supply(auth.uid()) AS ok
  ),
  facility AS (
    SELECT f.latitude AS lat, f.longitude AS lng
    FROM public.v2_processing_facilities f
    WHERE f.id = _facility_id
  ),
  base AS (
    SELECT
      sa.id                                            AS supply_id,
      sa.crop_id,
      c.code                                           AS crop_code,
      c.name_fr                                        AS crop_name_fr,
      c.name_en                                        AS crop_name_en,
      sa.variety_id,
      v.code                                           AS variety_code,
      v.name_fr                                        AS variety_name_fr,
      v.name_en                                        AS variety_name_en,
      sa.quantity_available                            AS quantity,
      sa.unit_code,
      public.v2_to_tonnes(sa.quantity_available, sa.unit_code) AS quantity_tonnes,
      sa.availability_start,
      sa.availability_end,
      sa.quality_grade,
      sa.certification_status,
      sa.status::text                                  AS supply_status,
      public.v2_freshness_status(COALESCE(sa.last_confirmed_at, sa.updated_at)) AS freshness,
      s.status::text                                   AS supplier_status,
      CASE WHEN s.status::text = 'field_verified' THEN 'field_verified' ELSE 'unverified' END AS verification_status,
      CASE
        WHEN s.supplier_type::text = 'cooperative'
          THEN 'Coopérative ' || CASE WHEN s.status::text = 'field_verified' THEN 'vérifiée' ELSE 'enregistrée' END
               || ' ' || s.supplier_code
        ELSE 'Producteur ' || CASE WHEN s.status::text = 'field_verified' THEN 'vérifié' ELSE 'enregistré' END
             || ' ' || s.supplier_code
      END                                              AS supplier_ref,
      s.supplier_type::text                            AS supplier_type,
      s.department,
      s.commune,
      public.v2_approx_coord(s.latitude)               AS approx_latitude,
      public.v2_approx_coord(s.longitude)              AS approx_longitude,
      public.v2_distance_km(
        (SELECT lat FROM facility), (SELECT lng FROM facility),
        s.latitude, s.longitude
      )                                                AS distance_km,
      sa.last_confirmed_at
    FROM public.v2_supply_availability sa
    JOIN public.v2_suppliers s ON s.id = sa.supplier_id
    JOIN public.v2_crops c     ON c.id = sa.crop_id
    LEFT JOIN public.v2_crop_varieties v ON v.id = sa.variety_id
    WHERE (SELECT ok FROM guard)
      AND s.is_active
      AND sa.status IN ('available','expected','forecast')
  ),
  scored AS (
    SELECT b.*,
      public.v2_supply_confidence(
        b.supplier_status, b.freshness, b.supply_status, b.last_confirmed_at,
        b.variety_id IS NOT NULL, b.availability_start IS NOT NULL
      ) AS confidence
    FROM base b
  ),
  filtered AS (
    SELECT * FROM scored
    WHERE (_crop_id IS NULL OR crop_id = _crop_id)
      AND (_variety_id IS NULL OR variety_id = _variety_id)
      AND (_department IS NULL OR department = _department)
      AND (_commune IS NULL OR commune = _commune)
      AND (_quality_grade IS NULL OR quality_grade = _quality_grade)
      AND (_freshness IS NULL OR freshness = ANY(_freshness))
      AND (_confidence IS NULL OR confidence = ANY(_confidence))
      AND (_min_quantity_t IS NULL OR COALESCE(quantity_tonnes, 0) >= _min_quantity_t)
      AND (_available_from IS NULL OR COALESCE(availability_end, availability_start, _available_from) >= _available_from)
      AND (_available_to IS NULL OR COALESCE(availability_start, availability_end, _available_to) <= _available_to)
      AND (_max_distance_km IS NULL OR (distance_km IS NOT NULL AND distance_km <= _max_distance_km))
      AND (NOT _verified_only OR verification_status = 'field_verified')
      AND (
        _search IS NULL OR _search = '' OR
        crop_name_fr ILIKE '%' || _search || '%' OR
        crop_name_en ILIKE '%' || _search || '%' OR
        COALESCE(variety_name_fr,'') ILIKE '%' || _search || '%' OR
        COALESCE(variety_name_en,'') ILIKE '%' || _search || '%' OR
        COALESCE(commune,'') ILIKE '%' || _search || '%' OR
        COALESCE(department,'') ILIKE '%' || _search || '%' OR
        supplier_ref ILIKE '%' || _search || '%'
      )
  )
  SELECT
    supply_id, crop_id, crop_code, crop_name_fr, crop_name_en,
    variety_id, variety_code, variety_name_fr, variety_name_en,
    quantity, unit_code, quantity_tonnes,
    availability_start, availability_end, quality_grade, certification_status,
    supply_status, freshness, confidence, verification_status,
    supplier_ref, supplier_type, department, commune,
    approx_latitude, approx_longitude, distance_km, last_confirmed_at,
    count(*) OVER () AS total_count
  FROM filtered
  ORDER BY
    CASE WHEN distance_km IS NULL THEN 1 ELSE 0 END,
    distance_km NULLS LAST,
    quantity_tonnes DESC NULLS LAST
  LIMIT COALESCE(_limit, 100) OFFSET COALESCE(_offset, 0)
$$;

-- 3.1 detail : same projection + commercially relevant history
CREATE OR REPLACE FUNCTION public.v2_commercial_supply_history(_supply_id uuid)
RETURNS TABLE (
  entry_type text,
  entry_date date,
  quantity numeric,
  unit_code text,
  quantity_tonnes numeric,
  confidence text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH guard AS (SELECT public.v2_can_read_commercial_supply(auth.uid()) AS ok),
  target AS (
    SELECT sa.id, sa.crop_cycle_id, sa.quantity_available, sa.unit_code, sa.last_confirmed_at, sa.updated_at
    FROM public.v2_supply_availability sa
    WHERE sa.id = _supply_id AND (SELECT ok FROM guard)
  )
  SELECT 'forecast' AS entry_type,
         hf.forecast_date AS entry_date,
         hf.estimated_quantity AS quantity,
         hf.unit_code,
         public.v2_to_tonnes(hf.estimated_quantity, hf.unit_code) AS quantity_tonnes,
         hf.confidence::text AS confidence
  FROM public.v2_harvest_forecasts hf
  JOIN target t ON t.crop_cycle_id = hf.crop_cycle_id
  UNION ALL
  SELECT 'confirmation',
         COALESCE(t.last_confirmed_at, t.updated_at)::date,
         t.quantity_available,
         t.unit_code,
         public.v2_to_tonnes(t.quantity_available, t.unit_code),
         'confirmed'
  FROM target t
  WHERE t.last_confirmed_at IS NOT NULL
  ORDER BY entry_date DESC
$$;

-- ---------------------------------------------------------------------
-- 4. Harvest pipeline (no double counting)
--    RULE: confirmed availability is the stronger commercial signal.
--    A crop cycle that already carries a commercial availability row is
--    counted ONLY through that row; its forecasts are excluded from totals
--    and are shown separately as planning intelligence.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.v2_supply_pipeline(
  _facility_id uuid DEFAULT NULL,
  _crop_id uuid DEFAULT NULL,
  _variety_id uuid DEFAULT NULL,
  _max_distance_km numeric DEFAULT NULL
)
RETURNS TABLE (
  bucket text,
  source text,
  quantity_tonnes numeric,
  record_count bigint,
  supplier_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH guard AS (SELECT public.v2_can_read_commercial_supply(auth.uid()) AS ok),
  facility AS (
    SELECT f.latitude AS lat, f.longitude AS lng
    FROM public.v2_processing_facilities f WHERE f.id = _facility_id
  ),
  confirmed AS (
    SELECT
      sa.id, sa.supplier_id, sa.crop_cycle_id, sa.crop_id, sa.variety_id, sa.status::text AS status,
      public.v2_to_tonnes(sa.quantity_available, sa.unit_code) AS tonnes,
      sa.availability_start,
      public.v2_distance_km((SELECT lat FROM facility), (SELECT lng FROM facility), s.latitude, s.longitude) AS distance_km
    FROM public.v2_supply_availability sa
    JOIN public.v2_suppliers s ON s.id = sa.supplier_id
    WHERE (SELECT ok FROM guard) AND s.is_active AND sa.status IN ('available','expected','forecast')
  ),
  latest_forecast AS (
    SELECT DISTINCT ON (hf.crop_cycle_id)
      hf.crop_cycle_id, hf.supplier_id, hf.estimated_quantity, hf.unit_code,
      COALESCE(hf.expected_harvest_start, cc.expected_harvest_start) AS harvest_start,
      cc.crop_id, cc.variety_id,
      public.v2_distance_km((SELECT lat FROM facility), (SELECT lng FROM facility), s.latitude, s.longitude) AS distance_km
    FROM public.v2_harvest_forecasts hf
    JOIN public.v2_crop_cycles cc ON cc.id = hf.crop_cycle_id
    JOIN public.v2_suppliers s ON s.id = hf.supplier_id
    WHERE (SELECT ok FROM guard)
      AND s.is_active
      AND cc.status IN ('planned','growing','harvest_approaching','harvesting')
      -- anti double-counting: skip cycles already represented by confirmed supply
      AND NOT EXISTS (SELECT 1 FROM confirmed c WHERE c.crop_cycle_id = hf.crop_cycle_id)
    ORDER BY hf.crop_cycle_id, hf.forecast_date DESC, hf.created_at DESC
  ),
  unioned AS (
    SELECT
      CASE
        WHEN status = 'available' AND (availability_start IS NULL OR availability_start <= current_date) THEN 'available_now'
        WHEN COALESCE(availability_start, current_date) <= current_date + 30 THEN 'within_30_days'
        WHEN COALESCE(availability_start, current_date) <= current_date + 90 THEN 'days_31_90'
        ELSE 'beyond_90_days'
      END AS bucket,
      'confirmed'::text AS source,
      tonnes, supplier_id, crop_id, variety_id, distance_km
    FROM confirmed
    UNION ALL
    SELECT
      CASE
        WHEN harvest_start IS NULL THEN 'beyond_90_days'
        WHEN harvest_start <= current_date THEN 'available_now'
        WHEN harvest_start <= current_date + 30 THEN 'within_30_days'
        WHEN harvest_start <= current_date + 90 THEN 'days_31_90'
        ELSE 'beyond_90_days'
      END,
      'forecast',
      public.v2_to_tonnes(estimated_quantity, unit_code),
      supplier_id, crop_id, variety_id, distance_km
    FROM latest_forecast
  )
  SELECT bucket, source,
         round(COALESCE(sum(tonnes), 0), 2) AS quantity_tonnes,
         count(*) AS record_count,
         count(DISTINCT supplier_id) AS supplier_count
  FROM unioned
  WHERE (_crop_id IS NULL OR crop_id = _crop_id)
    AND (_variety_id IS NULL OR variety_id = _variety_id)
    AND (_max_distance_km IS NULL OR (distance_km IS NOT NULL AND distance_km <= _max_distance_km))
  GROUP BY bucket, source
$$;

-- ---------------------------------------------------------------------
-- 5. Need-to-supply coverage for a processor organisation
--    Identified coverage only — never a procurement guarantee.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.v2_supply_coverage(
  _organization_id uuid,
  _facility_id uuid DEFAULT NULL
)
RETURNS TABLE (
  need_id uuid,
  crop_id uuid,
  crop_name_fr text,
  crop_name_en text,
  variety_id uuid,
  variety_name_fr text,
  variety_name_en text,
  need_tonnes_per_month numeric,
  radius_km numeric,
  identified_tonnes numeric,
  confirmed_tonnes numeric,
  supplier_count bigint,
  coverage_ratio numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH guard AS (
    SELECT public.v2_can_read_commercial_supply(auth.uid())
       AND public.v2_is_org_member(_organization_id, auth.uid()) AS ok
  ),
  facility AS (
    SELECT f.latitude AS lat, f.longitude AS lng
    FROM public.v2_processing_facilities f
    WHERE f.id = COALESCE(
      _facility_id,
      (SELECT id FROM public.v2_processing_facilities
        WHERE organization_id = _organization_id ORDER BY is_main DESC, created_at LIMIT 1)
    )
  ),
  needs AS (
    SELECT n.id AS need_id, n.crop_id, n.variety_id,
           CASE n.frequency
             WHEN 'weekly'    THEN public.v2_to_tonnes(n.quantity, COALESCE(n.unit_code, 't')) * 4.33
             WHEN 'daily'     THEN public.v2_to_tonnes(n.quantity, COALESCE(n.unit_code, 't')) * 30
             WHEN 'quarterly' THEN public.v2_to_tonnes(n.quantity, COALESCE(n.unit_code, 't')) / 3
             WHEN 'yearly'    THEN public.v2_to_tonnes(n.quantity, COALESCE(n.unit_code, 't')) / 12
             ELSE public.v2_to_tonnes(n.quantity, COALESCE(n.unit_code, 't'))
           END AS need_tonnes_per_month,
           COALESCE(n.sourcing_radius_km, 100) AS radius_km
    FROM public.v2_raw_material_needs n
    WHERE n.organization_id = _organization_id
      AND n.status = 'active'
      AND n.crop_id IS NOT NULL
      AND (SELECT ok FROM guard)
  ),
  supply AS (
    SELECT sa.crop_id, sa.variety_id, sa.supplier_id, sa.status::text AS status,
           public.v2_to_tonnes(sa.quantity_available, sa.unit_code) AS tonnes,
           public.v2_freshness_status(COALESCE(sa.last_confirmed_at, sa.updated_at)) AS freshness,
           public.v2_distance_km((SELECT lat FROM facility), (SELECT lng FROM facility), s.latitude, s.longitude) AS distance_km
    FROM public.v2_supply_availability sa
    JOIN public.v2_suppliers s ON s.id = sa.supplier_id
    WHERE s.is_active AND sa.status IN ('available','expected')
  )
  SELECT
    n.need_id, n.crop_id, c.name_fr, c.name_en, n.variety_id, v.name_fr, v.name_en,
    round(n.need_tonnes_per_month, 2) AS need_tonnes_per_month,
    n.radius_km,
    round(COALESCE(sum(sp.tonnes), 0), 2) AS identified_tonnes,
    round(COALESCE(sum(sp.tonnes) FILTER (WHERE sp.status = 'available' AND sp.freshness <> 'needs_verification'), 0), 2) AS confirmed_tonnes,
    count(DISTINCT sp.supplier_id) AS supplier_count,
    CASE WHEN COALESCE(n.need_tonnes_per_month, 0) > 0
         THEN round(COALESCE(sum(sp.tonnes), 0) / n.need_tonnes_per_month, 3)
         ELSE NULL END AS coverage_ratio
  FROM needs n
  JOIN public.v2_crops c ON c.id = n.crop_id
  LEFT JOIN public.v2_crop_varieties v ON v.id = n.variety_id
  LEFT JOIN supply sp
         ON sp.crop_id = n.crop_id
        AND (n.variety_id IS NULL OR sp.variety_id = n.variety_id)
        AND (sp.distance_km IS NULL OR sp.distance_km <= n.radius_km)
  GROUP BY n.need_id, n.crop_id, c.name_fr, c.name_en, n.variety_id, v.name_fr, v.name_en,
           n.need_tonnes_per_month, n.radius_km
$$;

-- ---------------------------------------------------------------------
-- 6. Internal data-quality feed (Agri-Grid field / admin only)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.v2_data_quality_summary()
RETURNS TABLE (issue text, record_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH guard AS (
    SELECT (public.v2_is_agrigrid_admin(auth.uid()) OR public.v2_is_field_agent(auth.uid())) AS ok
  )
  SELECT 'supply_needs_confirmation', count(*) FROM public.v2_supply_availability sa
    WHERE (SELECT ok FROM guard)
      AND sa.status IN ('available','expected')
      AND public.v2_freshness_status(COALESCE(sa.last_confirmed_at, sa.updated_at)) = 'needs_verification'
  UNION ALL
  SELECT 'forecasts_overdue', count(*) FROM public.v2_crop_cycles cc
    WHERE (SELECT ok FROM guard)
      AND cc.status IN ('growing','harvest_approaching','harvesting')
      AND COALESCE((SELECT max(hf.forecast_date) FROM public.v2_harvest_forecasts hf WHERE hf.crop_cycle_id = cc.id),
                   cc.created_at::date) < current_date - 30
  UNION ALL
  SELECT 'suppliers_no_recent_visit', count(*) FROM public.v2_suppliers s
    WHERE (SELECT ok FROM guard)
      AND s.is_active
      AND COALESCE((SELECT max(fv.visit_date) FROM public.v2_field_visits fv WHERE fv.supplier_id = s.id),
                   s.created_at::date) < current_date - 30
  UNION ALL
  SELECT 'suppliers_missing_gps', count(*) FROM public.v2_suppliers s
    WHERE (SELECT ok FROM guard) AND s.is_active AND (s.latitude IS NULL OR s.longitude IS NULL)
  UNION ALL
  SELECT 'supply_missing_variety', count(*) FROM public.v2_supply_availability sa
    WHERE (SELECT ok FROM guard) AND sa.variety_id IS NULL AND sa.status IN ('available','expected')
  UNION ALL
  SELECT 'forecasts_low_confidence', count(*) FROM public.v2_harvest_forecasts hf
    WHERE (SELECT ok FROM guard) AND hf.confidence = 'low' AND hf.forecast_date >= current_date - 90
$$;

-- ---------------------------------------------------------------------
-- 7. Execution grants — authenticated only, never anon/public
-- ---------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.v2_to_tonnes(numeric, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.v2_distance_km(numeric, numeric, numeric, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.v2_approx_coord(numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.v2_freshness_status(timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.v2_supply_confidence(text, text, text, timestamptz, boolean, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.v2_can_read_commercial_supply(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.v2_commercial_supply(uuid, uuid, uuid, text, text, text, text[], text[], numeric, date, date, numeric, boolean, text, int, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.v2_commercial_supply_history(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.v2_supply_pipeline(uuid, uuid, uuid, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.v2_supply_coverage(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.v2_data_quality_summary() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.v2_to_tonnes(numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v2_distance_km(numeric, numeric, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v2_approx_coord(numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v2_freshness_status(timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v2_supply_confidence(text, text, text, timestamptz, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v2_can_read_commercial_supply(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v2_commercial_supply(uuid, uuid, uuid, text, text, text, text[], text[], numeric, date, date, numeric, boolean, text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v2_commercial_supply_history(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v2_supply_pipeline(uuid, uuid, uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v2_supply_coverage(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v2_data_quality_summary() TO authenticated;

-- ---------------------------------------------------------------------
-- 8. Indexes for supply discovery at pilot and post-pilot scale
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_v2_supply_crop_status ON public.v2_supply_availability (crop_id, status);
CREATE INDEX IF NOT EXISTS idx_v2_supply_variety ON public.v2_supply_availability (variety_id);
CREATE INDEX IF NOT EXISTS idx_v2_supply_window ON public.v2_supply_availability (availability_start, availability_end);
CREATE INDEX IF NOT EXISTS idx_v2_supply_confirmed ON public.v2_supply_availability (last_confirmed_at DESC);
CREATE INDEX IF NOT EXISTS idx_v2_supply_cycle ON public.v2_supply_availability (crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_v2_suppliers_geo ON public.v2_suppliers (department, commune) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_v2_suppliers_active ON public.v2_suppliers (is_active, status);
CREATE INDEX IF NOT EXISTS idx_v2_cycles_status_harvest ON public.v2_crop_cycles (status, expected_harvest_start);
CREATE INDEX IF NOT EXISTS idx_v2_forecasts_supplier_date ON public.v2_harvest_forecasts (supplier_id, forecast_date DESC);
CREATE INDEX IF NOT EXISTS idx_v2_visits_supplier_date ON public.v2_field_visits (supplier_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_v2_facilities_org ON public.v2_processing_facilities (organization_id);
