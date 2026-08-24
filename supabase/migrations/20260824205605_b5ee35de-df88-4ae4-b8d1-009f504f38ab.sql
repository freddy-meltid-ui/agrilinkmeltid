-- =====================================================================
-- PHASE 3C.1B — COMPLIANCE COPILOT ANALYSIS FOUNDATION
-- Structured observation contract, review audit trail, consent linkage,
-- cancellation and retry safety. AI output still NEVER touches an
-- assessment answer or the readiness score.
-- =====================================================================

-- Observation types — deliberately NOT compliant/non-compliant.
DO $$ BEGIN
  CREATE TYPE public.v2_ai_observation_type AS ENUM (
    'positive_evidence','potential_gap','missing_visible_evidence','uncertain','not_assessable','suggested_action');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.v2_ai_compliance_analyses
  ADD COLUMN IF NOT EXISTS consent_record_id uuid REFERENCES public.v2_ai_consents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS analysis_schema_version text NOT NULL DEFAULT 'AI_OBS_SCHEMA_V2',
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

ALTER TABLE public.v2_ai_compliance_observations
  ADD COLUMN IF NOT EXISTS observation_code text,
  ADD COLUMN IF NOT EXISTS observation_type public.v2_ai_observation_type NOT NULL DEFAULT 'uncertain',
  ADD COLUMN IF NOT EXISTS evidence_reference text,
  -- Confidence in the OBSERVATION, never a percentage of compliance.
  ADD COLUMN IF NOT EXISTS ai_confidence_score numeric(4,3),
  ADD COLUMN IF NOT EXISTS requires_human_verification boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_limitation text,
  ADD COLUMN IF NOT EXISTS ai_suggested_next_action text;

ALTER TABLE public.v2_ai_compliance_observations
  DROP CONSTRAINT IF EXISTS v2_ai_obs_confidence_range;
ALTER TABLE public.v2_ai_compliance_observations
  ADD CONSTRAINT v2_ai_obs_confidence_range
  CHECK (ai_confidence_score IS NULL OR (ai_confidence_score >= 0 AND ai_confidence_score <= 1));

-- Backfill the type from the legacy kind so history stays readable.
UPDATE public.v2_ai_compliance_observations SET observation_type =
  CASE observation_kind
    WHEN 'potential_gap' THEN 'potential_gap'::public.v2_ai_observation_type
    WHEN 'missing_information' THEN 'missing_visible_evidence'::public.v2_ai_observation_type
    WHEN 'suggested_action' THEN 'suggested_action'::public.v2_ai_observation_type
    ELSE 'uncertain'::public.v2_ai_observation_type END
WHERE observation_type = 'uncertain';

-- The original AI output stays immutable, new columns included.
CREATE OR REPLACE FUNCTION public.v2_ai_protect_original_output()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.ai_title IS DISTINCT FROM OLD.ai_title
     OR NEW.ai_description IS DISTINCT FROM OLD.ai_description
     OR NEW.ai_category IS DISTINCT FROM OLD.ai_category
     OR NEW.ai_severity IS DISTINCT FROM OLD.ai_severity
     OR NEW.ai_confidence IS DISTINCT FROM OLD.ai_confidence
     OR NEW.ai_confidence_score IS DISTINCT FROM OLD.ai_confidence_score
     OR NEW.ai_rationale IS DISTINCT FROM OLD.ai_rationale
     OR NEW.ai_requirement_id IS DISTINCT FROM OLD.ai_requirement_id
     OR NEW.ai_limitation IS DISTINCT FROM OLD.ai_limitation
     OR NEW.ai_suggested_next_action IS DISTINCT FROM OLD.ai_suggested_next_action
     OR NEW.observation_type IS DISTINCT FROM OLD.observation_type
     OR NEW.observation_code IS DISTINCT FROM OLD.observation_code
     OR NEW.evidence_reference IS DISTINCT FROM OLD.evidence_reference
     OR NEW.ai_raw IS DISTINCT FROM OLD.ai_raw THEN
    RAISE EXCEPTION 'ORIGINAL_AI_OUTPUT_IMMUTABLE';
  END IF;
  RETURN NEW;
END $$;

-- ------------------------------------------------- review audit trail
CREATE TABLE IF NOT EXISTS public.v2_ai_analysis_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES public.v2_ai_compliance_analyses(id) ON DELETE CASCADE,
  observation_id uuid NOT NULL REFERENCES public.v2_ai_compliance_observations(id) ON DELETE CASCADE,
  decision public.v2_ai_review_status NOT NULL,
  previous_decision public.v2_ai_review_status,
  reviewed_title text,
  reviewed_description text,
  reviewed_severity public.v2_compliance_severity,
  review_comment text,
  reviewed_by uuid,
  reviewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS v2_ai_reviews_obs_idx ON public.v2_ai_analysis_reviews (observation_id, reviewed_at DESC);
GRANT SELECT ON public.v2_ai_analysis_reviews TO authenticated;
GRANT ALL ON public.v2_ai_analysis_reviews TO service_role;
ALTER TABLE public.v2_ai_analysis_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members read ai reviews" ON public.v2_ai_analysis_reviews;
CREATE POLICY "Members read ai reviews" ON public.v2_ai_analysis_reviews
  FOR SELECT TO authenticated USING (public.v2_is_org_member(organization_id, auth.uid()));

-- ------------------------------------------------- helpers
CREATE OR REPLACE FUNCTION public.v2_ai_safe_observation_type(_v text)
RETURNS public.v2_ai_observation_type LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE lower(COALESCE(_v,''))
    WHEN 'positive_evidence' THEN 'positive_evidence'
    WHEN 'potential_gap' THEN 'potential_gap'
    WHEN 'missing_visible_evidence' THEN 'missing_visible_evidence'
    WHEN 'not_assessable' THEN 'not_assessable'
    WHEN 'suggested_action' THEN 'suggested_action'
    ELSE 'uncertain' END::public.v2_ai_observation_type
$$;

-- ------------------------------------------------- structured validation
CREATE OR REPLACE FUNCTION public.v2_ai_validate_result(_result jsonb)
RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE _k text;
BEGIN
  IF _result IS NULL OR jsonb_typeof(_result) <> 'object' THEN
    RAISE EXCEPTION 'INVALID_RESULT_SCHEMA: root must be an object';
  END IF;
  IF COALESCE(_result->>'summary', _result->>'analysis_summary', '') = '' THEN
    RAISE EXCEPTION 'INVALID_RESULT_SCHEMA: an analysis summary is required';
  END IF;
  FOREACH _k IN ARRAY ARRAY['observations','potential_gaps','missing_information','suggested_actions','limitations'] LOOP
    IF _result ? _k AND jsonb_typeof(_result->_k) <> 'array' THEN
      RAISE EXCEPTION 'INVALID_RESULT_SCHEMA: % must be an array', _k;
    END IF;
  END LOOP;
  -- Limitations are mandatory: the model must state what it cannot establish.
  IF jsonb_typeof(COALESCE(_result->'limitations','null'::jsonb)) <> 'array'
     OR jsonb_array_length(COALESCE(_result->'limitations','[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'INVALID_RESULT_SCHEMA: at least one limitation is required';
  END IF;
  IF _result ? 'observations' THEN
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(_result->'observations') e
                WHERE jsonb_typeof(e) <> 'object' OR COALESCE(e->>'title','') = '') THEN
      RAISE EXCEPTION 'INVALID_RESULT_SCHEMA: each observation needs an object with a title';
    END IF;
    -- No compliance verdicts may enter the observation contract.
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(_result->'observations') e
                WHERE lower(COALESCE(e->>'observation_type','')) IN
                      ('compliant','non_compliant','noncompliant','conforme','non_conforme','certified','approved')) THEN
      RAISE EXCEPTION 'INVALID_RESULT_SCHEMA: compliance verdicts are not valid observation types';
    END IF;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(_result->'observations') e
                WHERE e ? 'confidence' AND jsonb_typeof(e->'confidence') = 'number'
                  AND ((e->>'confidence')::numeric < 0 OR (e->>'confidence')::numeric > 1)) THEN
    RAISE EXCEPTION 'INVALID_RESULT_SCHEMA: observation confidence must be between 0 and 1';
    END IF;
  END IF;
END $$;

-- ------------------------------------------------- store result (V2 contract)
CREATE OR REPLACE FUNCTION public.v2_ai_store_result(
  _analysis_id uuid, _result jsonb, _usage jsonb DEFAULT NULL, _model text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _a record; _o jsonb; _i int; _n int := 0; _txt text; _type public.v2_ai_observation_type;
BEGIN
  SELECT * INTO _a FROM public.v2_ai_compliance_analyses WHERE id = _analysis_id;
  IF _a.id IS NULL OR NOT public.v2_is_org_member(_a.organization_id, auth.uid()) THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;
  -- Retry safety: a completed analysis is never rewritten and never duplicated.
  IF _a.result IS NOT NULL THEN RAISE EXCEPTION 'ANALYSIS_ALREADY_COMPLETED'; END IF;
  IF _a.status = 'cancelled' THEN RAISE EXCEPTION 'ANALYSIS_CANCELLED'; END IF;
  PERFORM public.v2_ai_validate_result(_result);

  UPDATE public.v2_ai_compliance_analyses
     SET status = 'completed',
         result = _result,
         completed_at = now(),
         usage = _usage,
         model = COALESCE(_model, model),
         confidence = NULLIF(_result->>'confidence',''),
         relevance = public.v2_ai_relevance_of(_result->>'requirement_relevance')
   WHERE id = _analysis_id;

  _i := 0;
  FOR _o IN SELECT e FROM jsonb_array_elements(COALESCE(_result->'observations','[]'::jsonb)) e LOOP
    _i := _i + 1; _n := _n + 1;
    _type := CASE
      WHEN _o ? 'observation_type' THEN public.v2_ai_safe_observation_type(_o->>'observation_type')
      WHEN COALESCE((_o->>'is_positive')::boolean, false) THEN 'positive_evidence'::public.v2_ai_observation_type
      ELSE 'uncertain'::public.v2_ai_observation_type END;
    INSERT INTO public.v2_ai_compliance_observations(
        analysis_id, organization_id, sort_order, observation_kind, observation_type, observation_code,
        evidence_reference, ai_title, ai_description, ai_category, ai_severity, ai_confidence,
        ai_confidence_score, requires_human_verification, ai_limitation, ai_suggested_next_action,
        ai_rationale, ai_requirement_id, ai_raw)
    VALUES (_analysis_id, _a.organization_id, _i,
        CASE _type WHEN 'potential_gap' THEN 'potential_gap'
                   WHEN 'missing_visible_evidence' THEN 'missing_information'
                   WHEN 'suggested_action' THEN 'suggested_action'
                   ELSE 'observation' END,
        _type,
        NULLIF(_o->>'observation_code',''),
        NULLIF(_o->>'evidence_reference',''),
        left(_o->>'title', 300), _o->>'description',
        public.v2_ai_safe_category(_o->>'category'),
        public.v2_ai_safe_severity(COALESCE(_o->>'suggested_severity', _o->>'potential_severity')),
        NULLIF(_o->>'confidence_label',''),
        CASE WHEN jsonb_typeof(_o->'confidence') = 'number' THEN least(1, greatest(0, (_o->>'confidence')::numeric)) END,
        COALESCE((_o->>'requires_human_verification')::boolean, true),
        NULLIF(_o->>'limitation',''),
        NULLIF(_o->>'suggested_next_action',''),
        _o->>'rationale', _a.requirement_id, _o);
  END LOOP;

  -- Legacy V1 result shape stays supported so old analyses replay identically.
  FOR _o IN SELECT e FROM jsonb_array_elements(COALESCE(_result->'potential_gaps','[]'::jsonb)) e LOOP
    _txt := CASE WHEN jsonb_typeof(_o) = 'string' THEN _o #>> '{}' ELSE COALESCE(_o->>'title', _o->>'description') END;
    CONTINUE WHEN COALESCE(_txt,'') = '';
    _i := _i + 1; _n := _n + 1;
    INSERT INTO public.v2_ai_compliance_observations(
        analysis_id, organization_id, sort_order, observation_kind, observation_type, ai_title, ai_description,
        ai_severity, ai_requirement_id, ai_raw)
    VALUES (_analysis_id, _a.organization_id, _i, 'potential_gap', 'potential_gap', left(_txt, 300),
        CASE WHEN jsonb_typeof(_o) = 'object' THEN _o->>'description' END,
        CASE WHEN jsonb_typeof(_o) = 'object' THEN public.v2_ai_safe_severity(_o->>'potential_severity') END,
        _a.requirement_id, CASE WHEN jsonb_typeof(_o) = 'object' THEN _o ELSE jsonb_build_object('text', _txt) END);
  END LOOP;

  FOR _o IN SELECT e FROM jsonb_array_elements(COALESCE(_result->'missing_information','[]'::jsonb)) e LOOP
    _txt := CASE WHEN jsonb_typeof(_o) = 'string' THEN _o #>> '{}' ELSE COALESCE(_o->>'title', _o->>'description') END;
    CONTINUE WHEN COALESCE(_txt,'') = '';
    _i := _i + 1; _n := _n + 1;
    INSERT INTO public.v2_ai_compliance_observations(
        analysis_id, organization_id, sort_order, observation_kind, observation_type, ai_title, ai_description,
        ai_requirement_id, ai_raw)
    VALUES (_analysis_id, _a.organization_id, _i, 'missing_information', 'missing_visible_evidence', left(_txt, 300),
        CASE WHEN jsonb_typeof(_o) = 'object' THEN _o->>'description' END, _a.requirement_id,
        CASE WHEN jsonb_typeof(_o) = 'object' THEN _o ELSE jsonb_build_object('text', _txt) END);
  END LOOP;

  FOR _o IN SELECT e FROM jsonb_array_elements(COALESCE(_result->'suggested_actions','[]'::jsonb)) e LOOP
    _txt := CASE WHEN jsonb_typeof(_o) = 'string' THEN _o #>> '{}' ELSE COALESCE(_o->>'title', _o->>'description') END;
    CONTINUE WHEN COALESCE(_txt,'') = '';
    _i := _i + 1; _n := _n + 1;
    INSERT INTO public.v2_ai_compliance_observations(
        analysis_id, organization_id, sort_order, observation_kind, observation_type, ai_title, ai_description,
        ai_requirement_id, ai_raw)
    VALUES (_analysis_id, _a.organization_id, _i, 'suggested_action', 'suggested_action', left(_txt, 300),
        CASE WHEN jsonb_typeof(_o) = 'object' THEN _o->>'description' END, _a.requirement_id,
        CASE WHEN jsonb_typeof(_o) = 'object' THEN _o ELSE jsonb_build_object('text', _txt) END);
  END LOOP;

  INSERT INTO public.v2_ai_compliance_events(organization_id, event_type, analysis_id, actor_id, payload)
  VALUES (_a.organization_id, 'ai_analysis_completed', _analysis_id, auth.uid(),
          jsonb_build_object('items', _n, 'model', COALESCE(_model, _a.model),
                             'prompt_version', _a.prompt_version, 'schema_version', _a.analysis_schema_version));

  RETURN jsonb_build_object('analysis_id', _analysis_id, 'items', _n);
END $$;

-- ------------------------------------------------- cancellation
CREATE OR REPLACE FUNCTION public.v2_ai_cancel_analysis(_analysis_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _a record;
BEGIN
  SELECT * INTO _a FROM public.v2_ai_compliance_analyses WHERE id = _analysis_id;
  IF _a.id IS NULL OR NOT public.v2_is_org_member(_a.organization_id, auth.uid()) THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;
  IF _a.status NOT IN ('draft','queued','processing') THEN RAISE EXCEPTION 'ANALYSIS_NOT_CANCELLABLE'; END IF;
  UPDATE public.v2_ai_compliance_analyses
     SET status = 'cancelled', cancelled_at = now(), error_code = 'CANCELLED_BY_USER',
         error_message = left(_reason, 500), completed_at = now()
   WHERE id = _analysis_id;
  INSERT INTO public.v2_ai_compliance_events(organization_id, event_type, analysis_id, actor_id, payload)
  VALUES (_a.organization_id, 'ai_analysis_cancelled', _analysis_id, auth.uid(), '{}'::jsonb);
  RETURN jsonb_build_object('analysis_id', _analysis_id, 'status', 'cancelled');
END $$;

-- ------------------------------------------------- review + audit trail
CREATE OR REPLACE FUNCTION public.v2_ai_review_observation(
  _observation_id uuid,
  _decision public.v2_ai_review_status,
  _title text DEFAULT NULL,
  _description text DEFAULT NULL,
  _severity public.v2_compliance_severity DEFAULT NULL,
  _requirement_id uuid DEFAULT NULL,
  _comment text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o record; _after record;
BEGIN
  SELECT * INTO _o FROM public.v2_ai_compliance_observations WHERE id = _observation_id;
  IF _o.id IS NULL OR NOT public.v2_is_org_member(_o.organization_id, auth.uid()) THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;
  IF _decision NOT IN ('accepted','rejected','modified') THEN RAISE EXCEPTION 'INVALID_DECISION'; END IF;

  UPDATE public.v2_ai_compliance_observations
     SET review_status = _decision,
         reviewed_title = COALESCE(NULLIF(_title,''), CASE WHEN _decision = 'rejected' THEN reviewed_title ELSE COALESCE(reviewed_title, ai_title) END),
         reviewed_description = COALESCE(_description, reviewed_description, ai_description),
         reviewed_severity = COALESCE(_severity, reviewed_severity, ai_severity),
         reviewed_requirement_id = COALESCE(_requirement_id, reviewed_requirement_id, ai_requirement_id),
         reviewer_comment = COALESCE(_comment, reviewer_comment),
         reviewed_by = auth.uid(), reviewed_at = now()
   WHERE id = _observation_id
  RETURNING * INTO _after;

  INSERT INTO public.v2_ai_analysis_reviews(
      organization_id, analysis_id, observation_id, decision, previous_decision,
      reviewed_title, reviewed_description, reviewed_severity, review_comment, reviewed_by)
  VALUES (_o.organization_id, _o.analysis_id, _o.id, _decision, _o.review_status,
      _after.reviewed_title, _after.reviewed_description, _after.reviewed_severity, _comment, auth.uid());

  UPDATE public.v2_ai_compliance_analyses
     SET status = 'reviewed', reviewed_by = auth.uid(), reviewed_at = now()
   WHERE id = _o.analysis_id AND status = 'completed'
     AND NOT EXISTS (SELECT 1 FROM public.v2_ai_compliance_observations
                      WHERE analysis_id = _o.analysis_id AND review_status = 'pending_review' AND id <> _observation_id);

  INSERT INTO public.v2_ai_compliance_events(organization_id, event_type, analysis_id, observation_id, actor_id, payload)
  VALUES (_o.organization_id,
          CASE _decision WHEN 'accepted' THEN 'ai_observation_accepted'
                         WHEN 'rejected' THEN 'ai_observation_rejected'
                         ELSE 'ai_observation_modified' END,
          _o.analysis_id, _observation_id, auth.uid(),
          jsonb_build_object('decision', _decision,
                             'severity_changed', (_severity IS NOT NULL AND _severity IS DISTINCT FROM _o.ai_severity)));

  -- NOTE: no compliance assessment and no readiness value is touched here, by design.
  RETURN jsonb_build_object('observation_id', _observation_id, 'review_status', _decision,
                            'reassessment_required', _decision <> 'rejected');
END $$;

-- A positive observation is never a finding.
CREATE OR REPLACE FUNCTION public.v2_ai_finding_from_observation(_observation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o record; _a record; _fid uuid;
BEGIN
  SELECT * INTO _o FROM public.v2_ai_compliance_observations WHERE id = _observation_id FOR UPDATE;
  IF _o.id IS NULL OR NOT public.v2_is_org_member(_o.organization_id, auth.uid()) THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;
  IF _o.review_status NOT IN ('accepted','modified') THEN RAISE EXCEPTION 'HUMAN_VALIDATION_REQUIRED'; END IF;
  IF _o.observation_type = 'positive_evidence' THEN RAISE EXCEPTION 'POSITIVE_OBSERVATION_NOT_A_FINDING'; END IF;
  -- Idempotent: a retry returns the existing finding instead of duplicating it.
  IF _o.finding_id IS NOT NULL THEN RETURN jsonb_build_object('finding_id', _o.finding_id, 'created', false); END IF;

  SELECT * INTO _a FROM public.v2_ai_compliance_analyses WHERE id = _o.analysis_id;

  INSERT INTO public.v2_compliance_findings(
      organization_id, facility_id, org_program_id, requirement_id, severity, title, description,
      status, source, ai_analysis_id, ai_observation_id, created_by)
  VALUES (_o.organization_id, _a.facility_id, _a.org_program_id,
      COALESCE(_o.reviewed_requirement_id, _o.ai_requirement_id, _a.requirement_id),
      COALESCE(_o.reviewed_severity, _o.ai_severity, 'medium'),
      left(COALESCE(_o.reviewed_title, _o.ai_title), 300),
      COALESCE(_o.reviewed_description, _o.ai_description),
      'open', 'ai_assisted_human_validated', _a.id, _o.id, auth.uid())
  RETURNING id INTO _fid;

  UPDATE public.v2_ai_compliance_observations SET finding_id = _fid WHERE id = _observation_id;

  INSERT INTO public.v2_ai_compliance_events(organization_id, event_type, analysis_id, observation_id, entity_type, entity_id, actor_id, payload)
  VALUES (_o.organization_id, 'ai_finding_created', _a.id, _o.id, 'compliance_finding', _fid, auth.uid(),
          jsonb_build_object('source', 'ai_assisted_human_validated'));

  RETURN jsonb_build_object('finding_id', _fid, 'created', true, 'reassessment_required', true);
END $$;

REVOKE ALL ON FUNCTION public.v2_ai_cancel_analysis(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v2_ai_cancel_analysis(uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.v2_ai_safe_observation_type(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v2_ai_safe_observation_type(text) TO authenticated, service_role;