CREATE TYPE public.v2_org_role AS ENUM ('processor_admin','processor_employee','field_agent','farmer','cooperative_manager','agrigrid_admin','compliance_advisor','financial_partner');
CREATE TYPE public.v2_org_type AS ENUM ('processor','cooperative','field_network','agrigrid');

CREATE TABLE public.v2_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  legal_name text,
  org_type public.v2_org_type NOT NULL DEFAULT 'processor',
  country text NOT NULL DEFAULT 'BJ',
  region text,
  city text,
  status text NOT NULL DEFAULT 'active',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.v2_organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.v2_org_role NOT NULL DEFAULT 'processor_employee',
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX idx_v2_org_members_user ON public.v2_organization_members(user_id);
CREATE INDEX idx_v2_org_members_org ON public.v2_organization_members(organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_organizations TO authenticated;
GRANT ALL ON public.v2_organizations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_organization_members TO authenticated;
GRANT ALL ON public.v2_organization_members TO service_role;

CREATE OR REPLACE FUNCTION public.v2_is_org_member(_org_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.v2_organization_members WHERE organization_id = _org_id AND user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.v2_has_org_role(_org_id uuid, _user_id uuid, _role public.v2_org_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.v2_organization_members WHERE organization_id = _org_id AND user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.v2_is_org_admin(_org_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.v2_organization_members
    WHERE organization_id = _org_id AND user_id = _user_id
      AND role IN ('processor_admin','agrigrid_admin')
  )
$$;

REVOKE EXECUTE ON FUNCTION public.v2_is_org_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.v2_has_org_role(uuid, uuid, public.v2_org_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.v2_is_org_admin(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v2_is_org_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.v2_has_org_role(uuid, uuid, public.v2_org_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.v2_is_org_admin(uuid, uuid) TO authenticated, service_role;

ALTER TABLE public.v2_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their organizations" ON public.v2_organizations
  FOR SELECT TO authenticated USING (public.v2_is_org_member(id, auth.uid()));
CREATE POLICY "Authenticated users can create organizations" ON public.v2_organizations
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Org admins can update their organization" ON public.v2_organizations
  FOR UPDATE TO authenticated USING (public.v2_is_org_admin(id, auth.uid())) WITH CHECK (public.v2_is_org_admin(id, auth.uid()));
CREATE POLICY "Org admins can delete their organization" ON public.v2_organizations
  FOR DELETE TO authenticated USING (public.v2_is_org_admin(id, auth.uid()));

CREATE POLICY "Members can view org membership" ON public.v2_organization_members
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.v2_is_org_member(organization_id, auth.uid()));
CREATE POLICY "Founder or admin can add members" ON public.v2_organization_members
  FOR INSERT TO authenticated WITH CHECK (
    public.v2_is_org_admin(organization_id, auth.uid())
    OR (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.v2_organizations o WHERE o.id = organization_id AND o.created_by = auth.uid()))
  );
CREATE POLICY "Org admins can update members" ON public.v2_organization_members
  FOR UPDATE TO authenticated USING (public.v2_is_org_admin(organization_id, auth.uid())) WITH CHECK (public.v2_is_org_admin(organization_id, auth.uid()));
CREATE POLICY "Org admins can remove members" ON public.v2_organization_members
  FOR DELETE TO authenticated USING (public.v2_is_org_admin(organization_id, auth.uid()));

CREATE TRIGGER update_v2_organizations_updated_at BEFORE UPDATE ON public.v2_organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_v2_organization_members_updated_at BEFORE UPDATE ON public.v2_organization_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();