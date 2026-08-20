-- =====================================================================
-- AGRI-GRID V2 — PHASE 3A: COMPLIANCE READINESS FOUNDATION (additive)
-- =====================================================================

CREATE TYPE public.v2_compliance_category AS ENUM (
  'premises','hygiene','personnel','equipment','raw_materials','water','cleaning',
  'pest_control','waste','storage','traceability','labeling','documentation',
  'quality_control','process_control','other');

CREATE TYPE public.v2_requirement_type AS ENUM (
  'yes_no','multiple_choice','text','number','document_required','photo_required','date_required','confirmation');

CREATE TYPE public.v2_compliance_severity AS ENUM ('low','medium','high','critical');

CREATE TYPE public.v2_compliance_scope AS ENUM ('organization','facility');

CREATE TYPE public.v2_program_status AS ENUM ('not_started','in_progress','ready_for_review','completed','archived');

CREATE TYPE public.v2_assessment_response AS ENUM
  ('compliant','partially_compliant','non_compliant','not_assessed','not_applicable');

CREATE TYPE public.v2_evidence_type AS ENUM ('document','photo','video','text_note','external_reference');

CREATE TYPE public.v2_evidence_source AS ENUM
  ('user_upload','system_traceability','system_inventory','system_production','system_sales','system_document');

CREATE TYPE public.v2_finding_status AS ENUM ('open','action_planned','in_progress','resolved','verified','dismissed');

CREATE TYPE public.v2_action_status AS ENUM ('open','in_progress','completed','verified','cancelled');

CREATE TYPE public.v2_document_category AS ENUM (
  'legal','business_registration','tax','food_safety','lab_analysis','certificate',
  'inspection','procedure','training','facility','product','label','other');

-- ---------------------------------------------------------------- programs
CREATE TABLE public.v2_compliance_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_fr text NOT NULL,
  name_en text NOT NULL,
  description_fr text,
  description_en text,
  country text NOT NULL DEFAULT 'BJ',
  value_chain_id uuid REFERENCES public.v2_value_chains(id) ON DELETE SET NULL,
  product_applicability text,
  version text NOT NULL DEFAULT '1.0',
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  is_active boolean NOT NULL DEFAULT true,
  source_reference text,
  disclaimer_fr text NOT NULL,
  disclaimer_en text NOT NULL,
  managed_by text NOT NULL DEFAULT 'agrigrid',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.v2_compliance_programs TO authenticated;
GRANT ALL ON public.v2_compliance_programs TO service_role;
ALTER TABLE public.v2_compliance_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read active programs" ON public.v2_compliance_programs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "agrigrid admin manages programs" ON public.v2_compliance_programs
  FOR ALL TO authenticated
  USING (public.v2_is_agrigrid_admin(auth.uid()))
  WITH CHECK (public.v2_is_agrigrid_admin(auth.uid()));

-- ------------------------------------------------------------ requirements
CREATE TABLE public.v2_compliance_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.v2_compliance_programs(id) ON DELETE CASCADE,
  code text NOT NULL,
  title_fr text NOT NULL,
  title_en text NOT NULL,
  description_fr text,
  description_en text,
  category public.v2_compliance_category NOT NULL DEFAULT 'other',
  severity public.v2_compliance_severity NOT NULL DEFAULT 'medium',
  requirement_type public.v2_requirement_type NOT NULL DEFAULT 'yes_no',
  scope public.v2_compliance_scope NOT NULL DEFAULT 'organization',
  applicability_rule jsonb NOT NULL DEFAULT '{}'::jsonb,
  guidance_fr text,
  guidance_en text,
  evidence_expected_fr text,
  evidence_expected_en text,
  system_evidence_rule text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, code)
);
GRANT SELECT ON public.v2_compliance_requirements TO authenticated;
GRANT ALL ON public.v2_compliance_requirements TO service_role;
ALTER TABLE public.v2_compliance_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read requirements" ON public.v2_compliance_requirements
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "agrigrid admin manages requirements" ON public.v2_compliance_requirements
  FOR ALL TO authenticated
  USING (public.v2_is_agrigrid_admin(auth.uid()))
  WITH CHECK (public.v2_is_agrigrid_admin(auth.uid()));

-- ------------------------------------------------------- program activation
CREATE TABLE public.v2_org_compliance_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES public.v2_processing_facilities(id) ON DELETE SET NULL,
  program_id uuid NOT NULL REFERENCES public.v2_compliance_programs(id) ON DELETE RESTRICT,
  status public.v2_program_status NOT NULL DEFAULT 'not_started',
  started_at timestamptz NOT NULL DEFAULT now(),
  target_audit_date date,
  notes text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX v2_org_program_unique
  ON public.v2_org_compliance_programs (organization_id, program_id, COALESCE(facility_id, '00000000-0000-0000-0000-000000000000'::uuid));
GRANT SELECT, INSERT, UPDATE ON public.v2_org_compliance_programs TO authenticated;
GRANT ALL ON public.v2_org_compliance_programs TO service_role;
ALTER TABLE public.v2_org_compliance_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read org programs" ON public.v2_org_compliance_programs
  FOR SELECT TO authenticated USING (public.v2_is_org_member(organization_id, auth.uid()));
CREATE POLICY "org admins activate programs" ON public.v2_org_compliance_programs
  FOR INSERT TO authenticated WITH CHECK (public.v2_is_org_admin(organization_id, auth.uid()));
CREATE POLICY "org admins update programs" ON public.v2_org_compliance_programs
  FOR UPDATE TO authenticated
  USING (public.v2_is_org_admin(organization_id, auth.uid()))
  WITH CHECK (public.v2_is_org_admin(organization_id, auth.uid()));

-- ------------------------------------------------------------- assessments
-- Append-only: a new answer never overwrites the previous one.
CREATE TABLE public.v2_compliance_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  org_program_id uuid NOT NULL REFERENCES public.v2_org_compliance_programs(id) ON DELETE CASCADE,
  requirement_id uuid NOT NULL REFERENCES public.v2_compliance_requirements(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES public.v2_processing_facilities(id) ON DELETE SET NULL,
  response public.v2_assessment_response NOT NULL,
  comment text,
  confidence text,
  assessed_by uuid NOT NULL DEFAULT auth.uid(),
  assessed_at timestamptz NOT NULL DEFAULT now(),
  is_current boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_v2_assess_current ON public.v2_compliance_assessments (org_program_id, requirement_id, is_current);
GRANT SELECT, INSERT ON public.v2_compliance_assessments TO authenticated;
GRANT ALL ON public.v2_compliance_assessments TO service_role;
ALTER TABLE public.v2_compliance_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read assessments" ON public.v2_compliance_assessments
  FOR SELECT TO authenticated USING (public.v2_is_org_member(organization_id, auth.uid()));
CREATE POLICY "org members record assessments" ON public.v2_compliance_assessments
  FOR INSERT TO authenticated WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.v2_assessment_supersede()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.v2_compliance_assessments
     SET is_current = false
   WHERE org_program_id = NEW.org_program_id
     AND requirement_id = NEW.requirement_id
     AND id <> NEW.id AND is_current;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_v2_assessment_supersede
  AFTER INSERT ON public.v2_compliance_assessments
  FOR EACH ROW EXECUTE FUNCTION public.v2_assessment_supersede();

-- ---------------------------------------------------------------- evidence
CREATE TABLE public.v2_compliance_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES public.v2_processing_facilities(id) ON DELETE SET NULL,
  org_program_id uuid REFERENCES public.v2_org_compliance_programs(id) ON DELETE CASCADE,
  requirement_id uuid REFERENCES public.v2_compliance_requirements(id) ON DELETE CASCADE,
  assessment_id uuid REFERENCES public.v2_compliance_assessments(id) ON DELETE SET NULL,
  evidence_type public.v2_evidence_type NOT NULL DEFAULT 'document',
  source public.v2_evidence_source NOT NULL DEFAULT 'user_upload',
  title text NOT NULL,
  description text,
  storage_path text,
  external_reference text,
  related_entity_type text,
  related_entity_id uuid,
  related_entity_reference text,
  issue_date date,
  expiry_date date,
  verification_status text NOT NULL DEFAULT 'unverified',
  is_archived boolean NOT NULL DEFAULT false,
  uploaded_by uuid NOT NULL DEFAULT auth.uid(),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_v2_evidence_req ON public.v2_compliance_evidence (organization_id, requirement_id);
GRANT SELECT, INSERT, UPDATE ON public.v2_compliance_evidence TO authenticated;
GRANT ALL ON public.v2_compliance_evidence TO service_role;
ALTER TABLE public.v2_compliance_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read evidence" ON public.v2_compliance_evidence
  FOR SELECT TO authenticated USING (public.v2_is_org_member(organization_id, auth.uid()));
CREATE POLICY "org members add evidence" ON public.v2_compliance_evidence
  FOR INSERT TO authenticated WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()));
CREATE POLICY "org members update evidence" ON public.v2_compliance_evidence
  FOR UPDATE TO authenticated
  USING (public.v2_is_org_member(organization_id, auth.uid()))
  WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()));

-- future AI preparation (schema only — no analysis implemented in Phase 3A)
CREATE TABLE public.v2_compliance_evidence_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  evidence_id uuid NOT NULL REFERENCES public.v2_compliance_evidence(id) ON DELETE CASCADE,
  requirement_id uuid REFERENCES public.v2_compliance_requirements(id) ON DELETE SET NULL,
  analysis_version text NOT NULL,
  model text,
  findings jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric,
  human_validated boolean NOT NULL DEFAULT false,
  validated_by uuid,
  validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.v2_compliance_evidence_analyses TO authenticated;
GRANT ALL ON public.v2_compliance_evidence_analyses TO service_role;
ALTER TABLE public.v2_compliance_evidence_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read analyses" ON public.v2_compliance_evidence_analyses
  FOR SELECT TO authenticated USING (public.v2_is_org_member(organization_id, auth.uid()));

-- ------------------------------------------------------- document library
CREATE TABLE public.v2_compliance_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES public.v2_processing_facilities(id) ON DELETE SET NULL,
  category public.v2_document_category NOT NULL DEFAULT 'other',
  title text NOT NULL,
  description text,
  current_version integer NOT NULL DEFAULT 1,
  is_archived boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.v2_compliance_documents TO authenticated;
GRANT ALL ON public.v2_compliance_documents TO service_role;
ALTER TABLE public.v2_compliance_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read documents" ON public.v2_compliance_documents
  FOR SELECT TO authenticated USING (public.v2_is_org_member(organization_id, auth.uid()));
CREATE POLICY "org members write documents" ON public.v2_compliance_documents
  FOR INSERT TO authenticated WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()));
CREATE POLICY "org members update documents" ON public.v2_compliance_documents
  FOR UPDATE TO authenticated
  USING (public.v2_is_org_member(organization_id, auth.uid()))
  WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()));

CREATE TABLE public.v2_compliance_document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.v2_compliance_documents(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  storage_path text,
  file_name text,
  notes text,
  issue_date date,
  expiry_date date,
  is_current boolean NOT NULL DEFAULT true,
  uploaded_by uuid NOT NULL DEFAULT auth.uid(),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, version_number)
);
GRANT SELECT, INSERT ON public.v2_compliance_document_versions TO authenticated;
GRANT ALL ON public.v2_compliance_document_versions TO service_role;
ALTER TABLE public.v2_compliance_document_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read versions" ON public.v2_compliance_document_versions
  FOR SELECT TO authenticated USING (public.v2_is_org_member(organization_id, auth.uid()));
CREATE POLICY "org members add versions" ON public.v2_compliance_document_versions
  FOR INSERT TO authenticated WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()));

-- Non-destructive replacement: a new version supersedes but never deletes.
CREATE OR REPLACE FUNCTION public.v2_document_version_supersede()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.v2_compliance_document_versions
     SET is_current = false
   WHERE document_id = NEW.document_id AND id <> NEW.id AND is_current;
  UPDATE public.v2_compliance_documents
     SET current_version = NEW.version_number, updated_at = now()
   WHERE id = NEW.document_id;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_v2_document_version_supersede
  AFTER INSERT ON public.v2_compliance_document_versions
  FOR EACH ROW EXECUTE FUNCTION public.v2_document_version_supersede();

-- ---------------------------------------------------------------- findings
CREATE TABLE public.v2_compliance_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES public.v2_processing_facilities(id) ON DELETE SET NULL,
  org_program_id uuid REFERENCES public.v2_org_compliance_programs(id) ON DELETE CASCADE,
  requirement_id uuid REFERENCES public.v2_compliance_requirements(id) ON DELETE SET NULL,
  assessment_id uuid REFERENCES public.v2_compliance_assessments(id) ON DELETE SET NULL,
  severity public.v2_compliance_severity NOT NULL DEFAULT 'medium',
  title text NOT NULL,
  description text,
  status public.v2_finding_status NOT NULL DEFAULT 'open',
  created_by uuid DEFAULT auth.uid(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_v2_findings_open ON public.v2_compliance_findings (organization_id, status, severity);
GRANT SELECT, INSERT, UPDATE ON public.v2_compliance_findings TO authenticated;
GRANT ALL ON public.v2_compliance_findings TO service_role;
ALTER TABLE public.v2_compliance_findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read findings" ON public.v2_compliance_findings
  FOR SELECT TO authenticated USING (public.v2_is_org_member(organization_id, auth.uid()));
CREATE POLICY "org members create findings" ON public.v2_compliance_findings
  FOR INSERT TO authenticated WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()));
CREATE POLICY "org members update findings" ON public.v2_compliance_findings
  FOR UPDATE TO authenticated
  USING (public.v2_is_org_member(organization_id, auth.uid()))
  WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()));

-- ----------------------------------------------------- corrective actions
CREATE TABLE public.v2_compliance_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  finding_id uuid NOT NULL REFERENCES public.v2_compliance_findings(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  responsible_user_id uuid,
  responsible_name text,
  due_date date,
  priority public.v2_compliance_severity NOT NULL DEFAULT 'medium',
  status public.v2_action_status NOT NULL DEFAULT 'open',
  completion_note text,
  completion_evidence_id uuid REFERENCES public.v2_compliance_evidence(id) ON DELETE SET NULL,
  completed_at timestamptz,
  verified_by uuid,
  verified_at timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_v2_actions_open ON public.v2_compliance_actions (organization_id, status, due_date);
GRANT SELECT, INSERT, UPDATE ON public.v2_compliance_actions TO authenticated;
GRANT ALL ON public.v2_compliance_actions TO service_role;
ALTER TABLE public.v2_compliance_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read actions" ON public.v2_compliance_actions
  FOR SELECT TO authenticated USING (public.v2_is_org_member(organization_id, auth.uid()));
CREATE POLICY "org members create actions" ON public.v2_compliance_actions
  FOR INSERT TO authenticated WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()));
CREATE POLICY "org members update actions" ON public.v2_compliance_actions
  FOR UPDATE TO authenticated
  USING (public.v2_is_org_member(organization_id, auth.uid()))
  WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()));

-- ------------------------------------------------------------ audit trail
CREATE TABLE public.v2_compliance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  actor_id uuid DEFAULT auth.uid(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_v2_compliance_events_org ON public.v2_compliance_events (organization_id, created_at DESC);
GRANT SELECT ON public.v2_compliance_events TO authenticated;
GRANT ALL ON public.v2_compliance_events TO service_role;
ALTER TABLE public.v2_compliance_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read events" ON public.v2_compliance_events
  FOR SELECT TO authenticated USING (public.v2_is_org_member(organization_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.v2_log_compliance_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _type text; _payload jsonb;
BEGIN
  _type := TG_ARGV[0];
  _payload := to_jsonb(NEW) - 'organization_id';
  IF TG_OP = 'UPDATE' THEN
    _type := _type || '_updated';
  END IF;
  INSERT INTO public.v2_compliance_events (organization_id, event_type, entity_type, entity_id, payload)
  VALUES (NEW.organization_id, _type, TG_TABLE_NAME, NEW.id, _payload);
  RETURN NEW;
END $$;

CREATE TRIGGER trg_ev_org_program AFTER INSERT OR UPDATE ON public.v2_org_compliance_programs
  FOR EACH ROW EXECUTE FUNCTION public.v2_log_compliance_event('program_activated');
CREATE TRIGGER trg_ev_assessment AFTER INSERT ON public.v2_compliance_assessments
  FOR EACH ROW EXECUTE FUNCTION public.v2_log_compliance_event('assessment_recorded');
CREATE TRIGGER trg_ev_evidence AFTER INSERT OR UPDATE ON public.v2_compliance_evidence
  FOR EACH ROW EXECUTE FUNCTION public.v2_log_compliance_event('evidence_recorded');
CREATE TRIGGER trg_ev_finding AFTER INSERT OR UPDATE ON public.v2_compliance_findings
  FOR EACH ROW EXECUTE FUNCTION public.v2_log_compliance_event('finding_created');
CREATE TRIGGER trg_ev_action AFTER INSERT OR UPDATE ON public.v2_compliance_actions
  FOR EACH ROW EXECUTE FUNCTION public.v2_log_compliance_event('action_created');
CREATE TRIGGER trg_ev_doc_version AFTER INSERT ON public.v2_compliance_document_versions
  FOR EACH ROW EXECUTE FUNCTION public.v2_log_compliance_event('document_version_added');

-- ---------------------------------------------------------------- settings
CREATE TABLE public.v2_compliance_settings (
  organization_id uuid PRIMARY KEY REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  expiring_soon_days integer NOT NULL DEFAULT 60,
  weight_critical integer NOT NULL DEFAULT 5,
  weight_high integer NOT NULL DEFAULT 3,
  weight_medium integer NOT NULL DEFAULT 2,
  weight_low integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.v2_compliance_settings TO authenticated;
GRANT ALL ON public.v2_compliance_settings TO service_role;
ALTER TABLE public.v2_compliance_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read settings" ON public.v2_compliance_settings
  FOR SELECT TO authenticated USING (public.v2_is_org_member(organization_id, auth.uid()));
CREATE POLICY "org admins write settings" ON public.v2_compliance_settings
  FOR ALL TO authenticated
  USING (public.v2_is_org_admin(organization_id, auth.uid()))
  WITH CHECK (public.v2_is_org_admin(organization_id, auth.uid()));

-- updated_at triggers
CREATE TRIGGER trg_upd_programs BEFORE UPDATE ON public.v2_compliance_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_upd_requirements BEFORE UPDATE ON public.v2_compliance_requirements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_upd_org_programs BEFORE UPDATE ON public.v2_org_compliance_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_upd_evidence BEFORE UPDATE ON public.v2_compliance_evidence
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_upd_documents BEFORE UPDATE ON public.v2_compliance_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_upd_findings BEFORE UPDATE ON public.v2_compliance_findings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_upd_actions BEFORE UPDATE ON public.v2_compliance_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_upd_compl_settings BEFORE UPDATE ON public.v2_compliance_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();