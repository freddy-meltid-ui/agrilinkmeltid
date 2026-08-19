-- AGRI-GRID V2 — Phase 1A: security hardening + processor foundation (additive only)

-- 1) Harden org helper functions: they may only answer about the caller
CREATE OR REPLACE FUNCTION public.v2_is_org_member(_org_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _user_id = COALESCE(auth.uid(), _user_id)
     AND EXISTS (SELECT 1 FROM public.v2_organization_members WHERE organization_id = _org_id AND user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.v2_is_org_admin(_org_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _user_id = COALESCE(auth.uid(), _user_id)
     AND EXISTS (
      SELECT 1 FROM public.v2_organization_members
      WHERE organization_id = _org_id AND user_id = _user_id AND role IN ('processor_admin','agrigrid_admin')
    )
$$;

CREATE OR REPLACE FUNCTION public.v2_has_org_role(_org_id uuid, _user_id uuid, _role v2_org_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _user_id = COALESCE(auth.uid(), _user_id)
     AND EXISTS (SELECT 1 FROM public.v2_organization_members WHERE organization_id = _org_id AND user_id = _user_id AND role = _role)
$$;

REVOKE EXECUTE ON FUNCTION public.v2_is_org_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.v2_is_org_admin(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.v2_has_org_role(uuid, uuid, v2_org_role) FROM anon;

-- 2) Processor profile (1 per organization)
CREATE TABLE public.v2_processor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  trade_name text,
  legal_form text,
  rccm text,
  ifu text,
  year_established integer,
  business_phone text,
  business_email text,
  value_chains text[] NOT NULL DEFAULT '{}',
  employees_count integer,
  challenges text[] NOT NULL DEFAULT '{}',
  onboarding_step integer NOT NULL DEFAULT 1,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_processor_profiles TO authenticated;
GRANT ALL ON public.v2_processor_profiles TO service_role;
ALTER TABLE public.v2_processor_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read processor profile" ON public.v2_processor_profiles FOR SELECT TO authenticated USING (public.v2_is_org_member(organization_id, auth.uid()));
CREATE POLICY "Admins insert processor profile" ON public.v2_processor_profiles FOR INSERT TO authenticated WITH CHECK (public.v2_is_org_admin(organization_id, auth.uid()));
CREATE POLICY "Admins update processor profile" ON public.v2_processor_profiles FOR UPDATE TO authenticated USING (public.v2_is_org_admin(organization_id, auth.uid())) WITH CHECK (public.v2_is_org_admin(organization_id, auth.uid()));
CREATE POLICY "Admins delete processor profile" ON public.v2_processor_profiles FOR DELETE TO authenticated USING (public.v2_is_org_admin(organization_id, auth.uid()));
CREATE TRIGGER update_v2_processor_profiles_updated_at BEFORE UPDATE ON public.v2_processor_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Processing facilities
CREATE TABLE public.v2_processing_facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  department text,
  commune text,
  arrondissement text,
  address text,
  latitude numeric,
  longitude numeric,
  processing_capacity_value numeric,
  processing_capacity_unit text DEFAULT 'tonnes',
  processing_capacity_period text DEFAULT 'month',
  is_main boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_processing_facilities TO authenticated;
GRANT ALL ON public.v2_processing_facilities TO service_role;
ALTER TABLE public.v2_processing_facilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read facilities" ON public.v2_processing_facilities FOR SELECT TO authenticated USING (public.v2_is_org_member(organization_id, auth.uid()));
CREATE POLICY "Admins insert facilities" ON public.v2_processing_facilities FOR INSERT TO authenticated WITH CHECK (public.v2_is_org_admin(organization_id, auth.uid()));
CREATE POLICY "Admins update facilities" ON public.v2_processing_facilities FOR UPDATE TO authenticated USING (public.v2_is_org_admin(organization_id, auth.uid())) WITH CHECK (public.v2_is_org_admin(organization_id, auth.uid()));
CREATE POLICY "Admins delete facilities" ON public.v2_processing_facilities FOR DELETE TO authenticated USING (public.v2_is_org_admin(organization_id, auth.uid()));
CREATE TRIGGER update_v2_processing_facilities_updated_at BEFORE UPDATE ON public.v2_processing_facilities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_v2_facilities_org ON public.v2_processing_facilities(organization_id);

-- 4) Processed (finished) products
CREATE TABLE public.v2_processed_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES public.v2_processing_facilities(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  value_chain text,
  production_capacity_value numeric,
  production_capacity_unit text DEFAULT 'tonnes',
  production_capacity_period text DEFAULT 'month',
  notes text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_processed_products TO authenticated;
GRANT ALL ON public.v2_processed_products TO service_role;
ALTER TABLE public.v2_processed_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read processed products" ON public.v2_processed_products FOR SELECT TO authenticated USING (public.v2_is_org_member(organization_id, auth.uid()));
CREATE POLICY "Admins insert processed products" ON public.v2_processed_products FOR INSERT TO authenticated WITH CHECK (public.v2_is_org_admin(organization_id, auth.uid()));
CREATE POLICY "Admins update processed products" ON public.v2_processed_products FOR UPDATE TO authenticated USING (public.v2_is_org_admin(organization_id, auth.uid())) WITH CHECK (public.v2_is_org_admin(organization_id, auth.uid()));
CREATE POLICY "Admins delete processed products" ON public.v2_processed_products FOR DELETE TO authenticated USING (public.v2_is_org_admin(organization_id, auth.uid()));
CREATE TRIGGER update_v2_processed_products_updated_at BEFORE UPDATE ON public.v2_processed_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_v2_products_org ON public.v2_processed_products(organization_id);

-- 5) Raw material requirements (recurring sourcing needs)
CREATE TABLE public.v2_raw_material_needs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES public.v2_processing_facilities(id) ON DELETE SET NULL,
  crop text NOT NULL,
  variety text,
  quality_preference text,
  quantity numeric,
  unit text NOT NULL DEFAULT 'tonnes',
  frequency text NOT NULL DEFAULT 'monthly',
  sourcing_season text,
  sourcing_radius_km numeric,
  preferred_delivery_min numeric,
  preferred_delivery_max numeric,
  delivery_area text,
  notes text,
  status text NOT NULL DEFAULT 'active',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_raw_material_needs TO authenticated;
GRANT ALL ON public.v2_raw_material_needs TO service_role;
ALTER TABLE public.v2_raw_material_needs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read raw material needs" ON public.v2_raw_material_needs FOR SELECT TO authenticated USING (public.v2_is_org_member(organization_id, auth.uid()));
CREATE POLICY "Admins insert raw material needs" ON public.v2_raw_material_needs FOR INSERT TO authenticated WITH CHECK (public.v2_is_org_admin(organization_id, auth.uid()));
CREATE POLICY "Admins update raw material needs" ON public.v2_raw_material_needs FOR UPDATE TO authenticated USING (public.v2_is_org_admin(organization_id, auth.uid())) WITH CHECK (public.v2_is_org_admin(organization_id, auth.uid()));
CREATE POLICY "Admins delete raw material needs" ON public.v2_raw_material_needs FOR DELETE TO authenticated USING (public.v2_is_org_admin(organization_id, auth.uid()));
CREATE TRIGGER update_v2_raw_material_needs_updated_at BEFORE UPDATE ON public.v2_raw_material_needs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_v2_raw_needs_org ON public.v2_raw_material_needs(organization_id);