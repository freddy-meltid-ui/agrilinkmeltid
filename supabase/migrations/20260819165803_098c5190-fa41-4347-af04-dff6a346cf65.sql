-- ============ ENUMS ============
CREATE TYPE public.v2_supplier_type AS ENUM ('individual_farmer','cooperative','producer_group','aggregator');
CREATE TYPE public.v2_supplier_status AS ENUM ('unverified','field_verified','update_required','inactive');
CREATE TYPE public.v2_crop_cycle_status AS ENUM ('planned','growing','harvest_approaching','harvesting','completed','cancelled');
CREATE TYPE public.v2_supply_status AS ENUM ('forecast','expected','available','reserved','sold','expired','withdrawn');
CREATE TYPE public.v2_visit_type AS ENUM ('registration','data_update','crop_monitoring','harvest_forecast','supply_confirmation','quality_check','other');
CREATE TYPE public.v2_confidence AS ENUM ('low','medium','high');

-- ============ HELPER FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.v2_is_agrigrid_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id = COALESCE(auth.uid(), _user_id)
     AND EXISTS (SELECT 1 FROM public.v2_organization_members WHERE user_id = _user_id AND role = 'agrigrid_admin')
$$;
REVOKE EXECUTE ON FUNCTION public.v2_is_agrigrid_admin(uuid) FROM anon;

CREATE TABLE public.v2_field_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text NOT NULL,
  phone text,
  email text,
  country text NOT NULL DEFAULT 'BJ',
  assigned_areas text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_field_agents TO authenticated;
GRANT ALL ON public.v2_field_agents TO service_role;
ALTER TABLE public.v2_field_agents ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.v2_is_field_agent(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id = COALESCE(auth.uid(), _user_id)
     AND EXISTS (SELECT 1 FROM public.v2_field_agents WHERE user_id = _user_id AND status = 'active')
$$;
REVOKE EXECUTE ON FUNCTION public.v2_is_field_agent(uuid) FROM anon;

CREATE POLICY "field agents readable by network" ON public.v2_field_agents
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.v2_is_agrigrid_admin(auth.uid()));
CREATE POLICY "admins manage field agents" ON public.v2_field_agents
  FOR ALL TO authenticated
  USING (public.v2_is_agrigrid_admin(auth.uid()))
  WITH CHECK (public.v2_is_agrigrid_admin(auth.uid()));
CREATE TRIGGER update_v2_field_agents_updated_at BEFORE UPDATE ON public.v2_field_agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ REFERENCE DATA ============
CREATE TABLE public.v2_value_chains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_fr text NOT NULL,
  name_en text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_value_chains TO authenticated;
GRANT ALL ON public.v2_value_chains TO service_role;
ALTER TABLE public.v2_value_chains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "value chains readable" ON public.v2_value_chains FOR SELECT TO authenticated USING (true);
CREATE POLICY "value chains admin write" ON public.v2_value_chains FOR ALL TO authenticated
  USING (public.v2_is_agrigrid_admin(auth.uid())) WITH CHECK (public.v2_is_agrigrid_admin(auth.uid()));
CREATE TRIGGER update_v2_value_chains_updated_at BEFORE UPDATE ON public.v2_value_chains
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.v2_crops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  value_chain_id uuid REFERENCES public.v2_value_chains(id) ON DELETE SET NULL,
  code text NOT NULL UNIQUE,
  name_fr text NOT NULL,
  name_en text NOT NULL,
  default_unit_code text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_crops TO authenticated;
GRANT ALL ON public.v2_crops TO service_role;
ALTER TABLE public.v2_crops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crops readable" ON public.v2_crops FOR SELECT TO authenticated USING (true);
CREATE POLICY "crops admin write" ON public.v2_crops FOR ALL TO authenticated
  USING (public.v2_is_agrigrid_admin(auth.uid())) WITH CHECK (public.v2_is_agrigrid_admin(auth.uid()));
CREATE TRIGGER update_v2_crops_updated_at BEFORE UPDATE ON public.v2_crops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.v2_crop_varieties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id uuid NOT NULL REFERENCES public.v2_crops(id) ON DELETE CASCADE,
  code text NOT NULL,
  name_fr text NOT NULL,
  name_en text NOT NULL,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (crop_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_crop_varieties TO authenticated;
GRANT ALL ON public.v2_crop_varieties TO service_role;
ALTER TABLE public.v2_crop_varieties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "varieties readable" ON public.v2_crop_varieties FOR SELECT TO authenticated USING (true);
CREATE POLICY "varieties admin write" ON public.v2_crop_varieties FOR ALL TO authenticated
  USING (public.v2_is_agrigrid_admin(auth.uid())) WITH CHECK (public.v2_is_agrigrid_admin(auth.uid()));
CREATE TRIGGER update_v2_crop_varieties_updated_at BEFORE UPDATE ON public.v2_crop_varieties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.v2_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_fr text NOT NULL,
  name_en text NOT NULL,
  dimension text NOT NULL DEFAULT 'mass',
  to_base_factor numeric,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_units TO authenticated;
GRANT ALL ON public.v2_units TO service_role;
ALTER TABLE public.v2_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "units readable" ON public.v2_units FOR SELECT TO authenticated USING (true);
CREATE POLICY "units admin write" ON public.v2_units FOR ALL TO authenticated
  USING (public.v2_is_agrigrid_admin(auth.uid())) WITH CHECK (public.v2_is_agrigrid_admin(auth.uid()));
CREATE TRIGGER update_v2_units_updated_at BEFORE UPDATE ON public.v2_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.v2_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_settings TO authenticated;
GRANT ALL ON public.v2_settings TO service_role;
ALTER TABLE public.v2_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings readable" ON public.v2_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings admin write" ON public.v2_settings FOR ALL TO authenticated
  USING (public.v2_is_agrigrid_admin(auth.uid())) WITH CHECK (public.v2_is_agrigrid_admin(auth.uid()));
CREATE TRIGGER update_v2_settings_updated_at BEFORE UPDATE ON public.v2_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SUPPLIERS ============
CREATE SEQUENCE public.v2_supplier_code_seq START 1000;

CREATE TABLE public.v2_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_code text NOT NULL UNIQUE DEFAULT ('AG-SUP-' || lpad(nextval('public.v2_supplier_code_seq')::text, 6, '0')),
  supplier_type public.v2_supplier_type NOT NULL DEFAULT 'individual_farmer',
  display_name text NOT NULL,
  first_name text,
  last_name text,
  phone text,
  phone_secondary text,
  preferred_language text NOT NULL DEFAULT 'fr',
  country text NOT NULL DEFAULT 'BJ',
  department text,
  commune text,
  arrondissement text,
  village text,
  latitude numeric,
  longitude numeric,
  affiliation text,
  cooperative_supplier_id uuid REFERENCES public.v2_suppliers(id) ON DELETE SET NULL,
  status public.v2_supplier_status NOT NULL DEFAULT 'unverified',
  is_active boolean NOT NULL DEFAULT true,
  user_id uuid,
  notes text,
  last_verified_at timestamptz,
  client_ref text UNIQUE,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_suppliers TO authenticated;
GRANT ALL ON public.v2_suppliers TO service_role;
ALTER TABLE public.v2_suppliers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_v2_suppliers_updated_at BEFORE UPDATE ON public.v2_suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.v2_supplier_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.v2_suppliers(id) ON DELETE CASCADE,
  field_agent_id uuid NOT NULL REFERENCES public.v2_field_agents(id) ON DELETE CASCADE,
  assigned_by uuid,
  is_primary boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, field_agent_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_supplier_assignments TO authenticated;
GRANT ALL ON public.v2_supplier_assignments TO service_role;
ALTER TABLE public.v2_supplier_assignments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_v2_supplier_assignments_updated_at BEFORE UPDATE ON public.v2_supplier_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.v2_can_access_supplier(_supplier_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id = COALESCE(auth.uid(), _user_id)
     AND (
       public.v2_is_agrigrid_admin(_user_id)
       OR EXISTS (SELECT 1 FROM public.v2_suppliers s WHERE s.id = _supplier_id AND s.created_by = _user_id)
       OR EXISTS (
         SELECT 1 FROM public.v2_supplier_assignments a
         JOIN public.v2_field_agents fa ON fa.id = a.field_agent_id
         WHERE a.supplier_id = _supplier_id AND fa.user_id = _user_id AND fa.status = 'active'
       )
     )
$$;
REVOKE EXECUTE ON FUNCTION public.v2_can_access_supplier(uuid, uuid) FROM anon;

CREATE POLICY "suppliers readable by network" ON public.v2_suppliers FOR SELECT TO authenticated
  USING (public.v2_can_access_supplier(id, auth.uid()));
CREATE POLICY "agents create suppliers" ON public.v2_suppliers FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND (public.v2_is_field_agent(auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid())));
CREATE POLICY "network updates suppliers" ON public.v2_suppliers FOR UPDATE TO authenticated
  USING (public.v2_can_access_supplier(id, auth.uid())) WITH CHECK (public.v2_can_access_supplier(id, auth.uid()));
CREATE POLICY "admins delete suppliers" ON public.v2_suppliers FOR DELETE TO authenticated
  USING (public.v2_is_agrigrid_admin(auth.uid()));

CREATE POLICY "assignments readable" ON public.v2_supplier_assignments FOR SELECT TO authenticated
  USING (public.v2_can_access_supplier(supplier_id, auth.uid()));
CREATE POLICY "admins manage assignments" ON public.v2_supplier_assignments FOR ALL TO authenticated
  USING (public.v2_is_agrigrid_admin(auth.uid())) WITH CHECK (public.v2_is_agrigrid_admin(auth.uid()));

-- ============ FARMS ============
CREATE TABLE public.v2_farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.v2_suppliers(id) ON DELETE CASCADE,
  name text NOT NULL,
  country text NOT NULL DEFAULT 'BJ',
  department text,
  commune text,
  arrondissement text,
  village text,
  latitude numeric,
  longitude numeric,
  total_area numeric,
  area_unit text NOT NULL DEFAULT 'ha',
  accessibility_notes text,
  is_active boolean NOT NULL DEFAULT true,
  client_ref text UNIQUE,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_farms TO authenticated;
GRANT ALL ON public.v2_farms TO service_role;
ALTER TABLE public.v2_farms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "farms network access" ON public.v2_farms FOR ALL TO authenticated
  USING (public.v2_can_access_supplier(supplier_id, auth.uid()))
  WITH CHECK (public.v2_can_access_supplier(supplier_id, auth.uid()));
CREATE TRIGGER update_v2_farms_updated_at BEFORE UPDATE ON public.v2_farms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PARCELS ============
CREATE TABLE public.v2_farm_parcels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.v2_farms(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.v2_suppliers(id) ON DELETE CASCADE,
  reference text NOT NULL,
  area numeric,
  area_unit text NOT NULL DEFAULT 'ha',
  latitude numeric,
  longitude numeric,
  boundary_geojson jsonb,
  irrigation_status text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  client_ref text UNIQUE,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_farm_parcels TO authenticated;
GRANT ALL ON public.v2_farm_parcels TO service_role;
ALTER TABLE public.v2_farm_parcels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parcels network access" ON public.v2_farm_parcels FOR ALL TO authenticated
  USING (public.v2_can_access_supplier(supplier_id, auth.uid()))
  WITH CHECK (public.v2_can_access_supplier(supplier_id, auth.uid()));
CREATE TRIGGER update_v2_farm_parcels_updated_at BEFORE UPDATE ON public.v2_farm_parcels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CROP CYCLES ============
CREATE TABLE public.v2_crop_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id uuid NOT NULL REFERENCES public.v2_farm_parcels(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.v2_suppliers(id) ON DELETE CASCADE,
  crop_id uuid NOT NULL REFERENCES public.v2_crops(id),
  variety_id uuid REFERENCES public.v2_crop_varieties(id),
  planting_date date,
  expected_harvest_start date,
  expected_harvest_end date,
  cultivated_area numeric,
  area_unit text NOT NULL DEFAULT 'ha',
  estimated_yield numeric,
  yield_unit text NOT NULL DEFAULT 't',
  production_practice text,
  status public.v2_crop_cycle_status NOT NULL DEFAULT 'planned',
  notes text,
  client_ref text UNIQUE,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_crop_cycles TO authenticated;
GRANT ALL ON public.v2_crop_cycles TO service_role;
ALTER TABLE public.v2_crop_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cycles network access" ON public.v2_crop_cycles FOR ALL TO authenticated
  USING (public.v2_can_access_supplier(supplier_id, auth.uid()))
  WITH CHECK (public.v2_can_access_supplier(supplier_id, auth.uid()));
CREATE TRIGGER update_v2_crop_cycles_updated_at BEFORE UPDATE ON public.v2_crop_cycles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ FIELD VISITS ============
CREATE TABLE public.v2_field_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.v2_suppliers(id) ON DELETE CASCADE,
  farm_id uuid REFERENCES public.v2_farms(id) ON DELETE SET NULL,
  field_agent_id uuid REFERENCES public.v2_field_agents(id) ON DELETE SET NULL,
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  visit_type public.v2_visit_type NOT NULL DEFAULT 'data_update',
  latitude numeric,
  longitude numeric,
  notes text,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions_performed text[] NOT NULL DEFAULT '{}',
  next_visit_date date,
  client_ref text UNIQUE,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_field_visits TO authenticated;
GRANT ALL ON public.v2_field_visits TO service_role;
ALTER TABLE public.v2_field_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "visits network access" ON public.v2_field_visits FOR ALL TO authenticated
  USING (public.v2_can_access_supplier(supplier_id, auth.uid()))
  WITH CHECK (public.v2_can_access_supplier(supplier_id, auth.uid()));
CREATE TRIGGER update_v2_field_visits_updated_at BEFORE UPDATE ON public.v2_field_visits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ HARVEST FORECASTS (append only by convention) ============
CREATE TABLE public.v2_harvest_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_cycle_id uuid NOT NULL REFERENCES public.v2_crop_cycles(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.v2_suppliers(id) ON DELETE CASCADE,
  forecast_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_harvest_start date,
  expected_harvest_end date,
  estimated_quantity numeric NOT NULL,
  unit_code text NOT NULL DEFAULT 't',
  confidence public.v2_confidence NOT NULL DEFAULT 'medium',
  observation text,
  source text NOT NULL DEFAULT 'field_agent',
  captured_by uuid NOT NULL DEFAULT auth.uid(),
  field_visit_id uuid REFERENCES public.v2_field_visits(id) ON DELETE SET NULL,
  client_ref text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.v2_harvest_forecasts TO authenticated;
GRANT ALL ON public.v2_harvest_forecasts TO service_role;
ALTER TABLE public.v2_harvest_forecasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forecasts readable" ON public.v2_harvest_forecasts FOR SELECT TO authenticated
  USING (public.v2_can_access_supplier(supplier_id, auth.uid()));
CREATE POLICY "forecasts insertable" ON public.v2_harvest_forecasts FOR INSERT TO authenticated
  WITH CHECK (public.v2_can_access_supplier(supplier_id, auth.uid()) AND captured_by = auth.uid());
CREATE TRIGGER update_v2_harvest_forecasts_updated_at BEFORE UPDATE ON public.v2_harvest_forecasts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SUPPLY AVAILABILITY ============
CREATE TABLE public.v2_supply_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.v2_suppliers(id) ON DELETE CASCADE,
  crop_cycle_id uuid REFERENCES public.v2_crop_cycles(id) ON DELETE SET NULL,
  crop_id uuid NOT NULL REFERENCES public.v2_crops(id),
  variety_id uuid REFERENCES public.v2_crop_varieties(id),
  quantity_available numeric NOT NULL,
  unit_code text NOT NULL DEFAULT 't',
  availability_start date,
  availability_end date,
  asking_price numeric,
  price_unit text,
  quality_grade text,
  certification_status text,
  status public.v2_supply_status NOT NULL DEFAULT 'forecast',
  last_confirmed_at timestamptz,
  confirmed_by uuid,
  source text NOT NULL DEFAULT 'field_agent',
  notes text,
  client_ref text UNIQUE,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_supply_availability TO authenticated;
GRANT ALL ON public.v2_supply_availability TO service_role;
ALTER TABLE public.v2_supply_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "supply network access" ON public.v2_supply_availability FOR ALL TO authenticated
  USING (public.v2_can_access_supplier(supplier_id, auth.uid()))
  WITH CHECK (public.v2_can_access_supplier(supplier_id, auth.uid()));
CREATE TRIGGER update_v2_supply_availability_updated_at BEFORE UPDATE ON public.v2_supply_availability
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ INDEXES ============
CREATE INDEX idx_v2_farms_supplier ON public.v2_farms(supplier_id);
CREATE INDEX idx_v2_parcels_farm ON public.v2_farm_parcels(farm_id);
CREATE INDEX idx_v2_cycles_parcel ON public.v2_crop_cycles(parcel_id);
CREATE INDEX idx_v2_forecasts_cycle ON public.v2_harvest_forecasts(crop_cycle_id, forecast_date DESC);
CREATE INDEX idx_v2_supply_supplier ON public.v2_supply_availability(supplier_id);
CREATE INDEX idx_v2_visits_supplier ON public.v2_field_visits(supplier_id, visit_date DESC);
CREATE INDEX idx_v2_assignments_agent ON public.v2_supplier_assignments(field_agent_id);

-- ============ LINK PROCESSOR NEEDS TO REFERENCE DATA (additive) ============
ALTER TABLE public.v2_raw_material_needs
  ADD COLUMN crop_id uuid REFERENCES public.v2_crops(id),
  ADD COLUMN variety_id uuid REFERENCES public.v2_crop_varieties(id),
  ADD COLUMN unit_code text;

-- ============ SEED REFERENCE DATA ============
INSERT INTO public.v2_units (code, name_fr, name_en, dimension, to_base_factor, sort_order) VALUES
  ('kg','Kilogramme','Kilogram','mass',1,1),
  ('t','Tonne','Tonne','mass',1000,2),
  ('sac','Sac','Bag','mass',NULL,3),
  ('piece','Pièce','Piece','count',NULL,4),
  ('ha','Hectare','Hectare','area',10000,5),
  ('m2','Mètre carré','Square metre','area',1,6);

INSERT INTO public.v2_value_chains (code, name_fr, name_en, sort_order) VALUES
  ('pineapple','Ananas','Pineapple',1),
  ('cashew','Anacarde','Cashew',2);

INSERT INTO public.v2_crops (value_chain_id, code, name_fr, name_en, default_unit_code, sort_order)
SELECT id, 'pineapple', 'Ananas', 'Pineapple', 't', 1 FROM public.v2_value_chains WHERE code = 'pineapple';
INSERT INTO public.v2_crops (value_chain_id, code, name_fr, name_en, default_unit_code, sort_order)
SELECT id, 'cashew', 'Anacarde', 'Cashew', 't', 2 FROM public.v2_value_chains WHERE code = 'cashew';

INSERT INTO public.v2_crop_varieties (crop_id, code, name_fr, name_en, sort_order)
SELECT id, 'pain_de_sucre', 'Pain de Sucre', 'Sugarloaf', 1 FROM public.v2_crops WHERE code = 'pineapple';
INSERT INTO public.v2_crop_varieties (crop_id, code, name_fr, name_en, sort_order)
SELECT id, 'cayenne_lisse', 'Cayenne Lisse', 'Smooth Cayenne', 2 FROM public.v2_crops WHERE code = 'pineapple';
INSERT INTO public.v2_crop_varieties (crop_id, code, name_fr, name_en, sort_order)
SELECT id, 'local', 'Anacarde local', 'Local cashew', 1 FROM public.v2_crops WHERE code = 'cashew';

INSERT INTO public.v2_settings (key, value, description) VALUES
  ('supply_freshness_thresholds',
   '{"fresh_max_days":7,"aging_max_days":21}'::jsonb,
   'Data freshness thresholds in days: fresh <= fresh_max_days, aging <= aging_max_days, otherwise needs verification');

-- Map existing processor demo needs to the new reference data (additive, text preserved)
UPDATE public.v2_raw_material_needs n
SET crop_id = c.id,
    variety_id = v.id,
    unit_code = COALESCE(n.unit_code, n.unit)
FROM public.v2_crops c
LEFT JOIN public.v2_crop_varieties v ON v.crop_id = c.id AND v.code = 'pain_de_sucre'
WHERE c.code = 'pineapple' AND lower(n.crop) LIKE '%anana%';