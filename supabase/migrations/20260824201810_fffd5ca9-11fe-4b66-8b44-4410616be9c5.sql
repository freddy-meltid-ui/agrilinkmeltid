-- ---------------------------------------------------------------- helpers
CREATE OR REPLACE FUNCTION public.v2_ai_safe_severity(_v text)
RETURNS public.v2_compliance_severity LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
BEGIN
  IF _v IS NULL THEN RETURN NULL; END IF;
  RETURN lower(_v)::public.v2_compliance_severity;
EXCEPTION WHEN others THEN RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.v2_ai_safe_category(_v text)
RETURNS public.v2_compliance_category LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
BEGIN
  IF _v IS NULL THEN RETURN NULL; END IF;
  RETURN lower(_v)::public.v2_compliance_category;
EXCEPTION WHEN others THEN RETURN NULL;
END $$;

-- Deterministic schema validation. Nothing is stored unless the payload matches.
CREATE OR REPLACE FUNCTION public.v2_ai_validate_result(_result jsonb)
RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE _k text;
BEGIN
  IF _result IS NULL OR jsonb_typeof(_result) <> 'object' THEN
    RAISE EXCEPTION 'INVALID_RESULT_SCHEMA: root must be an object';
  END IF;
  IF jsonb_typeof(COALESCE(_result->'summary', '""'::jsonb)) <> 'string' THEN
    RAISE EXCEPTION 'INVALID_RESULT_SCHEMA: summary must be a string';
  END IF;
  FOREACH _k IN ARRAY ARRAY['observations','potential_gaps','missing_information','suggested_actions','limitations'] LOOP
    IF _result ? _k AND jsonb_typeof(_result->_k) <> 'array' THEN
      RAISE EXCEPTION 'INVALID_RESULT_SCHEMA: % must be an array', _k;
    END IF;
  END LOOP;
  IF _result ? 'observations' THEN
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(_result->'observations') e
                WHERE jsonb_typeof(e) <> 'object' OR COALESCE(e->>'title','') = '') THEN
      RAISE EXCEPTION 'INVALID_RESULT_SCHEMA: each observation needs an object with a title';
    END IF;
  END IF;
END $$;

-- ---------------------------------------------------------------- consent
CREATE OR REPLACE FUNCTION public.v2_ai_accept_consent(_organization_id uuid, _consent_version text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT public.v2_is_org_member(_organization_id, auth.uid()) THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;
  INSERT INTO public.v2_ai_consents(organization_id, user_id, consent_version)
  VALUES (_organization_id, auth.uid(), _consent_version)
  ON CONFLICT (organization_id, consent_version) DO UPDATE SET consent_version = EXCLUDED.consent_version
  RETURNING id INTO _id;
  INSERT INTO public.v2_ai_compliance_events(organization_id, event_type, actor_id, payload)
  VALUES (_organization_id, 'ai_consent_accepted', auth.uid(), jsonb_build_object('version', _consent_version));
  RETURN jsonb_build_object('consent_id', _id, 'version', _consent_version);
END $$;

-- ------------------------------------------------------- request analysis
CREATE OR REPLACE FUNCTION public.v2_ai_create_analysis(
  _organization_id uuid,
  _evidence_id uuid,
  _analysis_type public.v2_ai_analysis_type,
  _requirement_id uuid DEFAULT NULL,
  _org_program_id uuid DEFAULT NULL,
  _document_version_id uuid DEFAULT NULL,
  _user_context text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cfg record; _ev record; _req record; _prog record; _id uuid; _recent int; _prev uuid;
BEGIN
  IF NOT public.v2_is_org_member(_organization_id, auth.uid()) THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;

  SELECT * INTO _cfg FROM public.v2_ai_analysis_config WHERE analysis_type = _analysis_type;
  IF _cfg.analysis_type IS NULL THEN RAISE EXCEPTION 'ANALYSIS_TYPE_UNKNOWN'; END IF;
  IF NOT _cfg.is_enabled THEN RAISE EXCEPTION 'ANALYSIS_DISABLED'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.v2_ai_consents
                  WHERE organization_id = _organization_id AND consent_version = _cfg.consent_version) THEN
    RAISE EXCEPTION 'CONSENT_REQUIRED';
  END IF;

  -- Cross-tenant evidence must fail here, BEFORE any AI call.
  SELECT * INTO _ev FROM public.v2_compliance_evidence
   WHERE id = _evidence_id AND organization_id = _organization_id AND is_archived = false;
  IF _ev.id IS NULL THEN RAISE EXCEPTION 'EVIDENCE_NOT_FOUND'; END IF;
  IF _ev.storage_path IS NULL THEN RAISE EXCEPTION 'EVIDENCE_HAS_NO_FILE'; END IF;

  IF _document_version_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.v2_compliance_document_versions
       WHERE id = _document_version_id AND organization_id = _organization_id) THEN
    RAISE EXCEPTION 'DOCUMENT_VERSION_NOT_FOUND';
  END IF;

  IF _org_program_id IS NOT NULL THEN
    SELECT p.* INTO _prog FROM public.v2_org_compliance_programs op
      JOIN public.v2_compliance_programs p ON p.id = op.program_id
     WHERE op.id = _org_program_id AND op.organization_id = _organization_id;
    IF _prog.id IS NULL THEN RAISE EXCEPTION 'PROGRAM_NOT_FOUND'; END IF;
  END IF;

  IF _requirement_id IS NOT NULL THEN
    SELECT * INTO _req FROM public.v2_compliance_requirements WHERE id = _requirement_id AND is_active = true;
    IF _req.id IS NULL THEN RAISE EXCEPTION 'REQUIREMENT_NOT_FOUND'; END IF;
    IF _prog.id IS NOT NULL AND _req.program_id <> _prog.id THEN RAISE EXCEPTION 'REQUIREMENT_OUT_OF_PROGRAM'; END IF;
  END IF;

  SELECT count(*) INTO _recent FROM public.v2_ai_compliance_analyses
   WHERE organization_id = _organization_id AND requested_at > now() - interval '1 hour';
  IF _recent >= _cfg.max_analyses_per_hour THEN RAISE EXCEPTION 'RATE_LIMITED'; END IF;

  -- Re-analysis never overwrites: previous analyses stay, only is_latest moves.
  SELECT id INTO _prev FROM public.v2_ai_compliance_analyses
   WHERE evidence_id = _evidence_id AND analysis_type = _analysis_type AND is_latest = true
   ORDER BY requested_at DESC LIMIT 1;
  IF _prev IS NOT NULL THEN
    UPDATE public.v2_ai_compliance_analyses SET is_latest = false
     WHERE evidence_id = _evidence_id AND analysis_type = _analysis_type AND is_latest = true;
  END IF;

  INSERT INTO public.v2_ai_compliance_analyses(
      organization_id, facility_id, org_program_id, compliance_program_id, requirement_id,
      evidence_id, document_version_id, storage_path, analysis_type, provider, model, prompt_version,
      status, user_context, is_latest, supersedes_id, created_by)
  VALUES (_organization_id, _ev.facility_id, COALESCE(_org_program_id, _ev.org_program_id), _prog.id,
      COALESCE(_requirement_id, _ev.requirement_id), _evidence_id, _document_version_id, _ev.storage_path,
      _analysis_type, _cfg.provider, _cfg.model, _cfg.prompt_version, 'queued', _user_context, true, _prev, auth.uid())
  RETURNING id INTO _id;

  INSERT INTO public.v2_ai_compliance_events(organization_id, event_type, analysis_id, entity_type, entity_id, actor_id, payload)
  VALUES (_organization_id, 'ai_analysis_requested', _id, 'compliance_evidence', _evidence_id, auth.uid(),
          jsonb_build_object('analysis_type', _analysis_type, 'prompt_version', _cfg.prompt_version, 'model', _cfg.model));

  -- Data minimization: only the requirement/program context needed for THIS analysis is returned.
  RETURN jsonb_build_object(
    'analysis_id', _id,
    'analysis_type', _analysis_type,
    'storage_path', _ev.storage_path,
    'evidence', jsonb_build_object('id', _ev.id, 'title', _ev.title, 'type', _ev.evidence_type, 'description', _ev.description),
    'config', jsonb_build_object('model', _cfg.model, 'prompt_version', _cfg.prompt_version,
        'max_file_bytes', _cfg.max_file_bytes, 'supported_mime_types', to_jsonb(_cfg.supported_mime_types)),
    'requirement', CASE WHEN _req.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', _req.id, 'code', _req.code, 'title_fr', _req.title_fr, 'title_en', _req.title_en,
        'description_fr', _req.description_fr, 'description_en', _req.description_en,
        'guidance_fr', _req.guidance_fr, 'guidance_en', _req.guidance_en,
        'evidence_expected_fr', _req.evidence_expected_fr, 'evidence_expected_en', _req.evidence_expected_en,
        'category', _req.category, 'severity', _req.severity) END,
    'program', CASE WHEN _prog.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', _prog.id, 'code', _prog.code, 'name_fr', _prog.name_fr, 'name_en', _prog.name_en) END,
    'user_context', _user_context);
END $$;

CREATE OR REPLACE FUNCTION public.v2_ai_mark_processing(_analysis_id uuid, _mime_type text, _file_bytes bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org uuid;
BEGIN
  SELECT organization_id INTO _org FROM public.v2_ai_compliance_analyses WHERE id = _analysis_id;
  IF _org IS NULL OR NOT public.v2_is_org_member(_org, auth.uid()) THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;
  UPDATE public.v2_ai_compliance_analyses
     SET status = 'processing', mime_type = _mime_type, file_bytes = _file_bytes, analysed_at = now()
   WHERE id = _analysis_id;
END $$;

-- ---------------------------------------------------------- store result
CREATE OR REPLACE FUNCTION public.v2_ai_store_result(
  _analysis_id uuid, _result jsonb, _usage jsonb DEFAULT NULL, _model text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _a record; _o jsonb; _i int; _n int := 0; _txt text;
BEGIN
  SELECT * INTO _a FROM public.v2_ai_compliance_analyses WHERE id = _analysis_id;
  IF _a.id IS NULL OR NOT public.v2_is_org_member(_a.organization_id, auth.uid()) THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;
  IF _a.result IS NOT NULL THEN RAISE EXCEPTION 'ANALYSIS_ALREADY_COMPLETED'; END IF;
  PERFORM public.v2_ai_validate_result(_result);

  UPDATE public.v2_ai_compliance_analyses
     SET status = 'completed', result = _result, completed_at = now(), usage = _usage,
         model = COALESCE(_model, model),
         confidence = NULLIF(_result->>'confidence',''),
         relevance = public.v2_ai_relevance_of(_result->>'requirement_relevance')
   WHERE id = _analysis_id;

  _i := 0;
  FOR _o IN SELECT e FROM jsonb_array_elements(COALESCE(_result->'observations','[]'::jsonb)) e LOOP
    _i := _i + 1; _n := _n + 1;
    INSERT INTO public.v2_ai_compliance_observations(
        analysis_id, organization_id, sort_order, observation_kind, ai_title, ai_description,
        ai_category, ai_severity, ai_confidence, ai_rationale, ai_requirement_id, ai_raw)
    VALUES (_analysis_id, _a.organization_id, _i, COALESCE(NULLIF(_o->>'kind',''),'observation'),
        left(_o->>'title', 300), _o->>'description',
        public.v2_ai_safe_category(_o->>'category'), public.v2_ai_safe_severity(_o->>'potential_severity'),
        NULLIF(_o->>'confidence',''), _o->>'rationale', _a.requirement_id, _o);
  END LOOP;

  FOR _o IN SELECT e FROM jsonb_array_elements(COALESCE(_result->'potential_gaps','[]'::jsonb)) e LOOP
    _txt := CASE WHEN jsonb_typeof(_o) = 'string' THEN _o #>> '{}' ELSE COALESCE(_o->>'title', _o->>'description') END;
    CONTINUE WHEN COALESCE(_txt,'') = '';
    _i := _i + 1; _n := _n + 1;
    INSERT INTO public.v2_ai_compliance_observations(
        analysis_id, organization_id, sort_order, observation_kind, ai_title, ai_description,
        ai_severity, ai_requirement_id, ai_raw)
    VALUES (_analysis_id, _a.organization_id, _i, 'potential_gap', left(_txt, 300),
        CASE WHEN jsonb_typeof(_o) = 'object' THEN _o->>'description' END,
        CASE WHEN jsonb_typeof(_o) = 'object' THEN public.v2_ai_safe_severity(_o->>'potential_severity') END,
        _a.requirement_id, CASE WHEN jsonb_typeof(_o) = 'object' THEN _o ELSE jsonb_build_object('text', _txt) END);
  END LOOP;

  FOR _o IN SELECT e FROM jsonb_array_elements(COALESCE(_result->'missing_information','[]'::jsonb)) e LOOP
    _txt := CASE WHEN jsonb_typeof(_o) = 'string' THEN _o #>> '{}' ELSE COALESCE(_o->>'title', _o->>'description') END;
    CONTINUE WHEN COALESCE(_txt,'') = '';
    _i := _i + 1; _n := _n + 1;
    INSERT INTO public.v2_ai_compliance_observations(
        analysis_id, organization_id, sort_order, observation_kind, ai_title, ai_description, ai_requirement_id, ai_raw)
    VALUES (_analysis_id, _a.organization_id, _i, 'missing_information', left(_txt, 300),
        CASE WHEN jsonb_typeof(_o) = 'object' THEN _o->>'description' END, _a.requirement_id,
        CASE WHEN jsonb_typeof(_o) = 'object' THEN _o ELSE jsonb_build_object('text', _txt) END);
  END LOOP;

  FOR _o IN SELECT e FROM jsonb_array_elements(COALESCE(_result->'suggested_actions','[]'::jsonb)) e LOOP
    _txt := CASE WHEN jsonb_typeof(_o) = 'string' THEN _o #>> '{}' ELSE COALESCE(_o->>'title', _o->>'description') END;
    CONTINUE WHEN COALESCE(_txt,'') = '';
    _i := _i + 1; _n := _n + 1;
    INSERT INTO public.v2_ai_compliance_observations(
        analysis_id, organization_id, sort_order, observation_kind, ai_title, ai_description, ai_requirement_id, ai_raw)
    VALUES (_analysis_id, _a.organization_id, _i, 'suggested_action', left(_txt, 300),
        CASE WHEN jsonb_typeof(_o) = 'object' THEN _o->>'description' END, _a.requirement_id,
        CASE WHEN jsonb_typeof(_o) = 'object' THEN _o ELSE jsonb_build_object('text', _txt) END);
  END LOOP;

  INSERT INTO public.v2_ai_compliance_events(organization_id, event_type, analysis_id, actor_id, payload)
  VALUES (_a.organization_id, 'ai_analysis_completed', _analysis_id, auth.uid(),
          jsonb_build_object('items', _n, 'model', COALESCE(_model, _a.model), 'prompt_version', _a.prompt_version));

  RETURN jsonb_build_object('analysis_id', _analysis_id, 'items', _n);
END $$;

CREATE OR REPLACE FUNCTION public.v2_ai_relevance_of(_v text)
RETURNS public.v2_ai_relevance LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
BEGIN
  IF _v IS NULL THEN RETURN NULL; END IF;
  RETURN lower(_v)::public.v2_ai_relevance;
EXCEPTION WHEN others THEN RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.v2_ai_fail_analysis(_analysis_id uuid, _code text, _message text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _a record;
BEGIN
  SELECT * INTO _a FROM public.v2_ai_compliance_analyses WHERE id = _analysis_id;
  IF _a.id IS NULL OR NOT public.v2_is_org_member(_a.organization_id, auth.uid()) THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;
  UPDATE public.v2_ai_compliance_analyses
     SET status = 'failed', error_code = _code, error_message = left(_message, 1000), completed_at = now()
   WHERE id = _analysis_id;
  INSERT INTO public.v2_ai_compliance_events(organization_id, event_type, analysis_id, actor_id, payload)
  VALUES (_a.organization_id, 'ai_analysis_failed', _analysis_id, auth.uid(), jsonb_build_object('code', _code));
END $$;

-- --------------------------------------------------------- human review
CREATE OR REPLACE FUNCTION public.v2_ai_review_observation(
  _observation_id uuid,
  _decision public.v2_ai_review_status,
  _title text DEFAULT NULL,
  _description text DEFAULT NULL,
  _severity public.v2_compliance_severity DEFAULT NULL,
  _requirement_id uuid DEFAULT NULL,
  _comment text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o record;
BEGIN
  SELECT * INTO _o FROM public.v2_ai_compliance_observations WHERE id = _observation_id;
  IF _o.id IS NULL OR NOT public.v2_is_org_member(_o.organization_id, auth.uid()) THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;
  IF _decision NOT IN ('accepted','rejected','modified') THEN RAISE EXCEPTION 'INVALID_DECISION'; END IF;

  -- Human version is stored alongside; AI columns are protected by trigger.
  UPDATE public.v2_ai_compliance_observations
     SET review_status = _decision,
         reviewed_title = COALESCE(NULLIF(_title,''), CASE WHEN _decision = 'rejected' THEN reviewed_title ELSE COALESCE(reviewed_title, ai_title) END),
         reviewed_description = COALESCE(_description, reviewed_description, ai_description),
         reviewed_severity = COALESCE(_severity, reviewed_severity, ai_severity),
         reviewed_requirement_id = COALESCE(_requirement_id, reviewed_requirement_id, ai_requirement_id),
         reviewer_comment = COALESCE(_comment, reviewer_comment),
         reviewed_by = auth.uid(), reviewed_at = now()
   WHERE id = _observation_id;

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
          jsonb_build_object('decision', _decision, 'severity_changed', (_severity IS NOT NULL AND _severity IS DISTINCT FROM _o.ai_severity)));

  -- NOTE: no compliance assessment is touched here, by design.
  RETURN jsonb_build_object('observation_id', _observation_id, 'review_status', _decision,
                            'reassessment_required', _decision <> 'rejected');
END $$;

-- ------------------------------------------------- proposed finding / action
CREATE OR REPLACE FUNCTION public.v2_ai_finding_from_observation(_observation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o record; _a record; _fid uuid;
BEGIN
  SELECT * INTO _o FROM public.v2_ai_compliance_observations WHERE id = _observation_id;
  IF _o.id IS NULL OR NOT public.v2_is_org_member(_o.organization_id, auth.uid()) THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;
  IF _o.review_status NOT IN ('accepted','modified') THEN RAISE EXCEPTION 'HUMAN_VALIDATION_REQUIRED'; END IF;
  IF _o.finding_id IS NOT NULL THEN RETURN jsonb_build_object('finding_id', _o.finding_id, 'created', false); END IF;

  SELECT * INTO _a FROM public.v2_ai_compliance_analyses WHERE id = _o.analysis_id;

  INSERT INTO public.v2_compliance_findings(
      organization_id, facility_id, org_program_id, requirement_id, severity, title, description,
      status, source, ai_analysis_id, ai_observation_id, created_by)
  VALUES (_o.organization_id, _a.facility_id, _a.org_program_id,
      COALESCE(_o.reviewed_requirement_id, _o.ai_requirement_id),
      COALESCE(_o.reviewed_severity, _o.ai_severity, 'medium'),
      left(COALESCE(_o.reviewed_title, _o.ai_title), 300),
      COALESCE(_o.reviewed_description, _o.ai_description),
      'open', 'ai_assisted', _o.analysis_id, _o.id, auth.uid())
  RETURNING id INTO _fid;

  UPDATE public.v2_ai_compliance_observations SET finding_id = _fid WHERE id = _observation_id;

  INSERT INTO public.v2_ai_compliance_events(organization_id, event_type, analysis_id, observation_id, entity_type, entity_id, actor_id, payload)
  VALUES (_o.organization_id, 'ai_finding_created', _o.analysis_id, _o.id, 'compliance_finding', _fid, auth.uid(),
          jsonb_build_object('source', 'ai_assisted'));

  -- A finding never changes the requirement assessment: a reassessment stays mandatory.
  RETURN jsonb_build_object('finding_id', _fid, 'created', true, 'reassessment_required', true);
END $$;

CREATE OR REPLACE FUNCTION public.v2_ai_action_from_observation(
  _observation_id uuid, _title text DEFAULT NULL, _description text DEFAULT NULL,
  _due_date date DEFAULT NULL, _priority public.v2_compliance_severity DEFAULT NULL,
  _responsible_name text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o record; _fid uuid; _aid uuid;
BEGIN
  SELECT * INTO _o FROM public.v2_ai_compliance_observations WHERE id = _observation_id;
  IF _o.id IS NULL OR NOT public.v2_is_org_member(_o.organization_id, auth.uid()) THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;
  IF _o.review_status NOT IN ('accepted','modified') THEN RAISE EXCEPTION 'HUMAN_VALIDATION_REQUIRED'; END IF;

  _fid := _o.finding_id;
  IF _fid IS NULL THEN
    _fid := (public.v2_ai_finding_from_observation(_observation_id)->>'finding_id')::uuid;
  END IF;

  INSERT INTO public.v2_compliance_actions(
      organization_id, finding_id, title, description, responsible_name, due_date, priority, status,
      source, ai_observation_id, created_by)
  VALUES (_o.organization_id, _fid,
      left(COALESCE(NULLIF(_title,''), _o.reviewed_title, _o.ai_title), 300),
      COALESCE(_description, _o.reviewed_description, _o.ai_description),
      _responsible_name, _due_date,
      COALESCE(_priority, _o.reviewed_severity, _o.ai_severity, 'medium'), 'open',
      'ai_assisted', _o.id, auth.uid())
  RETURNING id INTO _aid;

  UPDATE public.v2_compliance_findings SET status = 'action_planned' WHERE id = _fid AND status = 'open';
  UPDATE public.v2_ai_compliance_observations SET action_id = _aid WHERE id = _observation_id;

  INSERT INTO public.v2_ai_compliance_events(organization_id, event_type, analysis_id, observation_id, entity_type, entity_id, actor_id, payload)
  VALUES (_o.organization_id, 'ai_action_created', _o.analysis_id, _o.id, 'compliance_action', _aid, auth.uid(),
          jsonb_build_object('source', 'ai_assisted'));

  RETURN jsonb_build_object('action_id', _aid, 'finding_id', _fid, 'reassessment_required', true);
END $$;

-- --------------------------------------------------------------- grants
REVOKE ALL ON FUNCTION public.v2_ai_accept_consent(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.v2_ai_create_analysis(uuid, uuid, public.v2_ai_analysis_type, uuid, uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.v2_ai_mark_processing(uuid, text, bigint) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.v2_ai_store_result(uuid, jsonb, jsonb, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.v2_ai_fail_analysis(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.v2_ai_review_observation(uuid, public.v2_ai_review_status, text, text, public.v2_compliance_severity, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.v2_ai_finding_from_observation(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.v2_ai_action_from_observation(uuid, text, text, date, public.v2_compliance_severity, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.v2_ai_accept_consent(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.v2_ai_create_analysis(uuid, uuid, public.v2_ai_analysis_type, uuid, uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.v2_ai_mark_processing(uuid, text, bigint) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.v2_ai_store_result(uuid, jsonb, jsonb, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.v2_ai_fail_analysis(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.v2_ai_review_observation(uuid, public.v2_ai_review_status, text, text, public.v2_compliance_severity, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.v2_ai_finding_from_observation(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.v2_ai_action_from_observation(uuid, text, text, date, public.v2_compliance_severity, text) TO authenticated, service_role;