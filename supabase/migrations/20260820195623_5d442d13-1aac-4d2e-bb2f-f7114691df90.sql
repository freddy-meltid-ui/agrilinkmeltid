-- ============================================================
-- PHASE 3A CLEANUP
-- ============================================================
ALTER TABLE public.v2_compliance_assessments ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.v2_compliance_evidence   ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.v2_compliance_documents  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

DELETE FROM public.v2_compliance_actions a
 USING public.v2_compliance_findings f
 WHERE a.finding_id = f.id
   AND f.requirement_id IN (SELECT id FROM public.v2_compliance_requirements WHERE code IN ('BJ-PRE-01','BJ-PRE-02'))
   AND f.created_at::date = DATE '2026-08-20';

DELETE FROM public.v2_compliance_findings f
 WHERE f.requirement_id IN (SELECT id FROM public.v2_compliance_requirements WHERE code IN ('BJ-PRE-01','BJ-PRE-02'))
   AND f.created_at::date = DATE '2026-08-20';

DELETE FROM public.v2_compliance_assessments a
 WHERE a.requirement_id IN (SELECT id FROM public.v2_compliance_requirements WHERE code IN ('BJ-PRE-01','BJ-PRE-02'))
   AND a.assessed_at::date = DATE '2026-08-20';

-- ============================================================
-- ENUMS
-- ============================================================
DO $enum1$ BEGIN
  CREATE TYPE public.v2_financing_purpose AS ENUM
    ('working_capital','raw_material_purchase','equipment','facility_expansion','packaging',
     'certification','logistics','export_development','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $enum1$;

DO $enum2$ BEGIN
  CREATE TYPE public.v2_financing_type AS ENUM
    ('short_term_loan','working_capital_facility','equipment_loan','invoice_financing',
     'leasing','grant','equity','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $enum2$;

DO $enum3$ BEGIN
  CREATE TYPE public.v2_finance_request_status AS ENUM ('draft','in_preparation','ready_for_review');
EXCEPTION WHEN duplicate_object THEN NULL; END $enum3$;

DO $enum4$ BEGIN
  CREATE TYPE public.v2_finance_recipient_type AS ENUM
    ('bank','microfinance','investor','guarantee_fund','development_partner','advisor','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $enum4$;

DO $enum5$ BEGIN
  CREATE TYPE public.v2_finance_share_scope AS ENUM
    ('business_profile','operating_metrics','sales_summary','documents','compliance_summary','full_dossier');
EXCEPTION WHEN duplicate_object THEN NULL; END $enum5$;

-- ============================================================
-- TABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.v2_finance_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  financing_purpose public.v2_financing_purpose,
  financing_type public.v2_financing_type,
  requested_amount numeric,
  currency text NOT NULL DEFAULT 'XOF',
  tenor_months integer,
  own_contribution numeric,
  intended_use text,
  target_date date,
  notes text,
  status public.v2_finance_request_status NOT NULL DEFAULT 'draft',
  is_demo boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_finance_profiles TO authenticated;
GRANT ALL ON public.v2_finance_profiles TO service_role;
ALTER TABLE public.v2_finance_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "finance profile readable by org members" ON public.v2_finance_profiles
  FOR SELECT TO authenticated USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()));
CREATE POLICY "finance profile writable by org members" ON public.v2_finance_profiles
  FOR ALL TO authenticated
  USING (public.v2_is_org_member(organization_id, auth.uid()))
  WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()));

CREATE TABLE IF NOT EXISTS public.v2_finance_use_of_funds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  finance_profile_id uuid NOT NULL REFERENCES public.v2_finance_profiles(id) ON DELETE CASCADE,
  category public.v2_financing_purpose NOT NULL,
  label text,
  amount numeric NOT NULL DEFAULT 0,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_finance_use_of_funds TO authenticated;
GRANT ALL ON public.v2_finance_use_of_funds TO service_role;
ALTER TABLE public.v2_finance_use_of_funds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "use of funds readable by org members" ON public.v2_finance_use_of_funds
  FOR SELECT TO authenticated USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()));
CREATE POLICY "use of funds writable by org members" ON public.v2_finance_use_of_funds
  FOR ALL TO authenticated
  USING (public.v2_is_org_member(organization_id, auth.uid()))
  WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()));

CREATE TABLE IF NOT EXISTS public.v2_finance_document_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  category text NOT NULL,
  importance text NOT NULL DEFAULT 'recommended',
  name_fr text NOT NULL,
  name_en text NOT NULL,
  description_fr text,
  description_en text,
  country text,
  suggested_document_category public.v2_document_category,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.v2_finance_document_requirements TO authenticated;
GRANT ALL ON public.v2_finance_document_requirements TO service_role;
ALTER TABLE public.v2_finance_document_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "finance doc catalogue readable" ON public.v2_finance_document_requirements
  FOR SELECT TO authenticated USING (is_active);

CREATE TABLE IF NOT EXISTS public.v2_finance_document_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  requirement_code text NOT NULL REFERENCES public.v2_finance_document_requirements(code) ON DELETE CASCADE,
  document_id uuid REFERENCES public.v2_compliance_documents(id) ON DELETE CASCADE,
  evidence_id uuid REFERENCES public.v2_compliance_evidence(id) ON DELETE CASCADE,
  note text,
  linked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, requirement_code, document_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_finance_document_links TO authenticated;
GRANT ALL ON public.v2_finance_document_links TO service_role;
ALTER TABLE public.v2_finance_document_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "finance doc links readable by org members" ON public.v2_finance_document_links
  FOR SELECT TO authenticated USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()));
CREATE POLICY "finance doc links writable by org members" ON public.v2_finance_document_links
  FOR ALL TO authenticated
  USING (public.v2_is_org_member(organization_id, auth.uid()))
  WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()));

CREATE TABLE IF NOT EXISTS public.v2_finance_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  finance_profile_id uuid REFERENCES public.v2_finance_profiles(id) ON DELETE CASCADE,
  recipient_type public.v2_finance_recipient_type NOT NULL,
  recipient_name text NOT NULL,
  recipient_email text,
  scopes public.v2_finance_share_scope[] NOT NULL DEFAULT ARRAY['business_profile']::public.v2_finance_share_scope[],
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revoked_by uuid,
  last_accessed_at timestamptz,
  access_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_finance_shares TO authenticated;
GRANT ALL ON public.v2_finance_shares TO service_role;
ALTER TABLE public.v2_finance_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "finance shares readable by org members" ON public.v2_finance_shares
  FOR SELECT TO authenticated USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()));
CREATE POLICY "finance shares managed by org admins" ON public.v2_finance_shares
  FOR ALL TO authenticated
  USING (public.v2_is_org_admin(organization_id, auth.uid()))
  WITH CHECK (public.v2_is_org_admin(organization_id, auth.uid()));

CREATE TABLE IF NOT EXISTS public.v2_finance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  actor_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.v2_finance_events TO authenticated;
GRANT ALL ON public.v2_finance_events TO service_role;
ALTER TABLE public.v2_finance_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "finance events readable by org members" ON public.v2_finance_events
  FOR SELECT TO authenticated USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()));
CREATE POLICY "finance events insertable by org members" ON public.v2_finance_events
  FOR INSERT TO authenticated WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()));

CREATE TABLE IF NOT EXISTS public.v2_finance_settings (
  organization_id uuid PRIMARY KEY REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.v2_finance_settings TO authenticated;
GRANT ALL ON public.v2_finance_settings TO service_role;
ALTER TABLE public.v2_finance_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "finance settings readable by org members" ON public.v2_finance_settings
  FOR SELECT TO authenticated USING (public.v2_is_org_member(organization_id, auth.uid()));
CREATE POLICY "finance settings managed by org admins" ON public.v2_finance_settings
  FOR ALL TO authenticated
  USING (public.v2_is_org_admin(organization_id, auth.uid()))
  WITH CHECK (public.v2_is_org_admin(organization_id, auth.uid()));

CREATE TRIGGER v2_finance_profiles_updated BEFORE UPDATE ON public.v2_finance_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER v2_finance_uof_updated BEFORE UPDATE ON public.v2_finance_use_of_funds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER v2_finance_settings_updated BEFORE UPDATE ON public.v2_finance_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.v2_log_finance_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn_log$
DECLARE _org uuid; _type text;
BEGIN
  _org := COALESCE(NEW.organization_id, OLD.organization_id);
  _type := TG_ARGV[0] || '_' || lower(TG_OP);
  INSERT INTO public.v2_finance_events(organization_id, event_type, entity_type, entity_id, actor_id, payload)
  VALUES (_org, _type, TG_ARGV[0], COALESCE(NEW.id, OLD.id), auth.uid(), to_jsonb(COALESCE(NEW, OLD)) - 'token_hash');
  RETURN COALESCE(NEW, OLD);
END $fn_log$;

CREATE TRIGGER v2_finance_profile_audit AFTER INSERT OR UPDATE ON public.v2_finance_profiles
  FOR EACH ROW EXECUTE FUNCTION public.v2_log_finance_event('finance_profile');
CREATE TRIGGER v2_finance_doc_link_audit AFTER INSERT OR DELETE ON public.v2_finance_document_links
  FOR EACH ROW EXECUTE FUNCTION public.v2_log_finance_event('finance_document_link');
CREATE TRIGGER v2_finance_share_audit AFTER INSERT OR UPDATE ON public.v2_finance_shares
  FOR EACH ROW EXECUTE FUNCTION public.v2_log_finance_event('finance_share');

-- ============================================================
-- DOCUMENT CHECKLIST SEED
-- ============================================================
INSERT INTO public.v2_finance_document_requirements
  (code, category, importance, name_fr, name_en, description_fr, description_en, country, suggested_document_category, sort_order)
VALUES
 ('RCCM','legal','required','Registre du commerce (RCCM)','Business registration (RCCM)','Preuve d enregistrement legal de l entreprise.','Proof of legal registration of the business.','BJ','business_registration',10),
 ('IFU','tax','required','Identifiant fiscal unique (IFU)','Tax identification number (IFU)','Numero fiscal de l entreprise.','Tax identification number of the business.','BJ','tax',20),
 ('PROMOTER_ID','legal','required','Piece d identite du promoteur','Promoter identification','Piece d identite du ou des dirigeants.','Identity document of the owner or manager.',NULL,'legal',30),
 ('PROOF_OF_ADDRESS','legal','required','Justificatif d adresse','Proof of address','Justificatif d adresse de l entreprise ou du site.','Proof of address of the business or facility.',NULL,'facility',40),
 ('BANK_STATEMENTS','financial','required','Releves bancaires','Bank statements','Releves bancaires recents (souvent 6 a 12 mois).','Recent bank statements (often 6 to 12 months).',NULL,'other',50),
 ('BUSINESS_PLAN','financial','required','Plan d affaires','Business plan','Presentation de l activite, du marche et du projet finance.','Description of the activity, market and financed project.',NULL,'other',60),
 ('FINANCIAL_STATEMENTS','financial','recommended','Etats financiers historiques','Historical financial statements','Etats financiers des exercices precedents s ils existent.','Financial statements of previous years, if any.',NULL,'other',70),
 ('TAX_DOCUMENTS','tax','recommended','Documents fiscaux','Tax documents','Declarations ou attestations fiscales.','Tax returns or tax clearance documents.',NULL,'tax',80),
 ('PROFORMA_QUOTES','commercial','recommended','Devis / factures pro forma','Quotations / pro-forma invoices','Devis pour les equipements ou intrants a financer.','Quotations for equipment or inputs to be financed.',NULL,'other',90),
 ('CONTRACTS_ORDERS','commercial','recommended','Contrats / bons de commande','Contracts / purchase orders','Contrats clients ou commandes confirmees.','Customer contracts or confirmed purchase orders.',NULL,'other',100),
 ('CERTIFICATIONS','compliance','situational','Certifications','Certifications','Certificats qualite, hygiene ou export si applicables.','Quality, hygiene or export certificates where applicable.',NULL,'certificate',110),
 ('EXISTING_LOANS','financial','situational','Encours de credit existants','Existing loan information','Informations sur les credits en cours.','Information on outstanding loans.',NULL,'other',120),
 ('COLLATERAL_DOCS','collateral','situational','Documents de garantie','Collateral documents','Titres ou documents de garantie si demandes.','Titles or collateral documents where requested.',NULL,'legal',130),
 ('INSURANCE','other','situational','Assurances','Insurance','Polices d assurance de l activite ou des actifs.','Insurance policies covering the activity or assets.',NULL,'other',140)
ON CONFLICT (code) DO NOTHING;