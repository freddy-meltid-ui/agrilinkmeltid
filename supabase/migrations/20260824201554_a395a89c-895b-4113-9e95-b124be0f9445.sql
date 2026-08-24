-- =====================================================================
-- PHASE 3C.1 — AGRI-GRID COMPLIANCE COPILOT
-- Advisory AI analysis of compliance evidence with MANDATORY human review.
-- Hard rules enforced here:
--  * AI output NEVER changes a compliance assessment (no writes to
--    v2_compliance_assessments anywhere in this migration).
--  * AI output NEVER contributes to readiness (no readiness function touched).
--  * Original AI output is immutable; human edits live in separate columns.
--  * Findings / corrective actions are only created on explicit confirmation.
-- =====================================================================

CREATE TYPE public.v2_ai_analysis_type AS ENUM ('document_requirement','product_label','facility_photo');
CREATE TYPE public.v2_ai_analysis_status AS ENUM ('queued','processing','completed','failed','reviewed','archived');
CREATE TYPE public.v2_ai_review_status AS ENUM ('pending_review','accepted','rejected','modified');
CREATE TYPE public.v2_ai_relevance AS ENUM ('relevant_evidence_detected','potentially_relevant','insufficient_evidence','unable_to_determine');

-- ------------------------------------------------------------ config
CREATE TABLE public.v2_ai_analysis_config (
  analysis_type public.v2_ai_analysis_type PRIMARY KEY,
  is_enabled boolean NOT NULL DEFAULT true,
  provider text NOT NULL DEFAULT 'lovable_ai_gateway',
  model text NOT NULL DEFAULT 'google/gemini-3-flash',
  prompt_version text NOT NULL,
  max_file_bytes bigint NOT NULL DEFAULT 10485760,
  supported_mime_types text[] NOT NULL,
  max_analyses_per_hour integer NOT NULL DEFAULT 30,
  consent_version text NOT NULL DEFAULT 'AI_EVIDENCE_CONSENT_V1',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.v2_ai_analysis_config TO authenticated;
GRANT ALL ON public.v2_ai_analysis_config TO service_role;
ALTER TABLE public.v2_ai_analysis_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read copilot config" ON public.v2_ai_analysis_config
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage copilot config" ON public.v2_ai_analysis_config
  FOR ALL TO authenticated USING (public.v2_is_agrigrid_admin(auth.uid()))
  WITH CHECK (public.v2_is_agrigrid_admin(auth.uid()));

INSERT INTO public.v2_ai_analysis_config(analysis_type, prompt_version, supported_mime_types, max_file_bytes)
VALUES
 ('document_requirement','DOCUMENT_REQUIREMENT_V1',
   ARRAY['application/pdf','image/jpeg','image/png','image/webp'], 10485760),
 ('product_label','LABEL_REVIEW_V1',
   ARRAY['application/pdf','image/jpeg','image/png','image/webp'], 10485760),
 ('facility_photo','FACILITY_PHOTO_V1',
   ARRAY['image/jpeg','image/png','image/webp'], 10485760);

-- ------------------------------------------------------------ consent
CREATE TABLE public.v2_ai_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  consent_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, consent_version)
);
GRANT SELECT, INSERT ON public.v2_ai_consents TO authenticated;
GRANT ALL ON public.v2_ai_consents TO service_role;
ALTER TABLE public.v2_ai_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read ai consent" ON public.v2_ai_consents
  FOR SELECT TO authenticated USING (public.v2_is_org_member(organization_id, auth.uid()));
CREATE POLICY "Members record ai consent" ON public.v2_ai_consents
  FOR INSERT TO authenticated
  WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()) AND user_id = auth.uid());

-- ------------------------------------------------------------ analyses
CREATE TABLE public.v2_ai_compliance_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES public.v2_processing_facilities(id) ON DELETE SET NULL,
  org_program_id uuid REFERENCES public.v2_org_compliance_programs(id) ON DELETE SET NULL,
  compliance_program_id uuid REFERENCES public.v2_compliance_programs(id) ON DELETE SET NULL,
  requirement_id uuid REFERENCES public.v2_compliance_requirements(id) ON DELETE SET NULL,
  -- the EXACT evidence analysed; a document version is pinned so a later
  -- version never inherits this analysis.
  evidence_id uuid NOT NULL REFERENCES public.v2_compliance_evidence(id) ON DELETE CASCADE,
  document_version_id uuid REFERENCES public.v2_compliance_document_versions(id) ON DELETE SET NULL,
  storage_path text,
  mime_type text,
  file_bytes bigint,
  analysis_type public.v2_ai_analysis_type NOT NULL,
  provider text NOT NULL DEFAULT 'lovable_ai_gateway',
  model text NOT NULL,
  prompt_version text NOT NULL,
  status public.v2_ai_analysis_status NOT NULL DEFAULT 'queued',
  user_context text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  analysed_at timestamptz,
  completed_at timestamptz,
  result jsonb,
  relevance public.v2_ai_relevance,
  confidence text,
  error_code text,
  error_message text,
  usage jsonb,
  is_latest boolean NOT NULL DEFAULT true,
  supersedes_id uuid REFERENCES public.v2_ai_compliance_analyses(id) ON DELETE SET NULL,
  created_by uuid,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX v2_ai_analyses_org_idx ON public.v2_ai_compliance_analyses (organization_id, requested_at DESC);
CREATE INDEX v2_ai_analyses_evidence_idx ON public.v2_ai_compliance_analyses (evidence_id, requested_at DESC);
CREATE INDEX v2_ai_analyses_req_idx ON public.v2_ai_compliance_analyses (requirement_id);
GRANT SELECT ON public.v2_ai_compliance_analyses TO authenticated;
GRANT ALL ON public.v2_ai_compliance_analyses TO service_role;
ALTER TABLE public.v2_ai_compliance_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read ai analyses" ON public.v2_ai_compliance_analyses
  FOR SELECT TO authenticated USING (public.v2_is_org_member(organization_id, auth.uid()));

-- ------------------------------------------------------------ observations
CREATE TABLE public.v2_ai_compliance_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES public.v2_ai_compliance_analyses(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  observation_kind text NOT NULL DEFAULT 'observation',
  -- ORIGINAL AI OUTPUT — immutable (see trigger below).
  ai_title text NOT NULL,
  ai_description text,
  ai_category public.v2_compliance_category,
  ai_severity public.v2_compliance_severity,
  ai_confidence text,
  ai_rationale text,
  ai_requirement_id uuid REFERENCES public.v2_compliance_requirements(id) ON DELETE SET NULL,
  ai_raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- HUMAN-VALIDATED VERSION — never overwrites the AI columns above.
  review_status public.v2_ai_review_status NOT NULL DEFAULT 'pending_review',
  reviewed_title text,
  reviewed_description text,
  reviewed_severity public.v2_compliance_severity,
  reviewed_requirement_id uuid REFERENCES public.v2_compliance_requirements(id) ON DELETE SET NULL,
  reviewer_comment text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  finding_id uuid REFERENCES public.v2_compliance_findings(id) ON DELETE SET NULL,
  action_id uuid REFERENCES public.v2_compliance_actions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX v2_ai_obs_analysis_idx ON public.v2_ai_compliance_observations (analysis_id, sort_order);
CREATE INDEX v2_ai_obs_org_status_idx ON public.v2_ai_compliance_observations (organization_id, review_status);
GRANT SELECT ON public.v2_ai_compliance_observations TO authenticated;
GRANT ALL ON public.v2_ai_compliance_observations TO service_role;
ALTER TABLE public.v2_ai_compliance_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read ai observations" ON public.v2_ai_compliance_observations
  FOR SELECT TO authenticated USING (public.v2_is_org_member(organization_id, auth.uid()));

-- The original AI output can never be rewritten, whatever the caller.
CREATE OR REPLACE FUNCTION public.v2_ai_protect_original_output()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.ai_title IS DISTINCT FROM OLD.ai_title
     OR NEW.ai_description IS DISTINCT FROM OLD.ai_description
     OR NEW.ai_category IS DISTINCT FROM OLD.ai_category
     OR NEW.ai_severity IS DISTINCT FROM OLD.ai_severity
     OR NEW.ai_confidence IS DISTINCT FROM OLD.ai_confidence
     OR NEW.ai_rationale IS DISTINCT FROM OLD.ai_rationale
     OR NEW.ai_requirement_id IS DISTINCT FROM OLD.ai_requirement_id
     OR NEW.ai_raw IS DISTINCT FROM OLD.ai_raw THEN
    RAISE EXCEPTION 'ORIGINAL_AI_OUTPUT_IMMUTABLE';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER v2_ai_obs_immutable BEFORE UPDATE ON public.v2_ai_compliance_observations
  FOR EACH ROW EXECUTE FUNCTION public.v2_ai_protect_original_output();

-- A completed analysis result is written once by the storing routine and kept.
CREATE OR REPLACE FUNCTION public.v2_ai_protect_analysis_result()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.result IS NOT NULL AND NEW.result IS DISTINCT FROM OLD.result THEN
    RAISE EXCEPTION 'ANALYSIS_RESULT_IMMUTABLE';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER v2_ai_analysis_immutable BEFORE UPDATE ON public.v2_ai_compliance_analyses
  FOR EACH ROW EXECUTE FUNCTION public.v2_ai_protect_analysis_result();

-- ------------------------------------------------------------ audit log
CREATE TABLE public.v2_ai_compliance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  analysis_id uuid,
  observation_id uuid,
  entity_type text,
  entity_id uuid,
  actor_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX v2_ai_events_org_idx ON public.v2_ai_compliance_events (organization_id, created_at DESC);
GRANT SELECT ON public.v2_ai_compliance_events TO authenticated;
GRANT ALL ON public.v2_ai_compliance_events TO service_role;
ALTER TABLE public.v2_ai_compliance_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read ai events" ON public.v2_ai_compliance_events
  FOR SELECT TO authenticated USING (public.v2_is_org_member(organization_id, auth.uid()));

-- ------------------------------------------------- usage (Agri-Grid ops only)
CREATE TABLE public.v2_ai_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  analysis_id uuid,
  analysis_type public.v2_ai_analysis_type NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  status text NOT NULL,
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  cost_estimate numeric(12,6),
  latency_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX v2_ai_usage_org_idx ON public.v2_ai_usage_events (organization_id, created_at DESC);
GRANT ALL ON public.v2_ai_usage_events TO service_role;
ALTER TABLE public.v2_ai_usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read ai usage" ON public.v2_ai_usage_events
  FOR SELECT TO authenticated USING (public.v2_is_agrigrid_admin(auth.uid()));

-- --------------------------------------- provenance on findings / actions
ALTER TABLE public.v2_compliance_findings
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'human',
  ADD COLUMN IF NOT EXISTS ai_analysis_id uuid,
  ADD COLUMN IF NOT EXISTS ai_observation_id uuid;
ALTER TABLE public.v2_compliance_actions
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'human',
  ADD COLUMN IF NOT EXISTS ai_observation_id uuid;