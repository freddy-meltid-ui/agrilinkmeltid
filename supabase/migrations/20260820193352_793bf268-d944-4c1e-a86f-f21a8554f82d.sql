-- ============ storage: private compliance evidence bucket ============
-- Path convention: <organization_id>/<rest...>
CREATE POLICY "compliance evidence read own org" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'compliance-evidence'
     AND public.v2_is_org_member(NULLIF(split_part(name, '/', 1), '')::uuid, auth.uid()));
CREATE POLICY "compliance evidence insert own org" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'compliance-evidence'
     AND public.v2_is_org_member(NULLIF(split_part(name, '/', 1), '')::uuid, auth.uid()));
CREATE POLICY "compliance evidence update own org" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'compliance-evidence'
     AND public.v2_is_org_member(NULLIF(split_part(name, '/', 1), '')::uuid, auth.uid()))
  WITH CHECK (bucket_id = 'compliance-evidence'
     AND public.v2_is_org_member(NULLIF(split_part(name, '/', 1), '')::uuid, auth.uid()));

-- ============ trigger helpers are internal only ============
REVOKE ALL ON FUNCTION public.v2_assessment_supersede() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.v2_document_version_supersede() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.v2_log_compliance_event() FROM PUBLIC, anon, authenticated;

-- ============ deterministic expiry status ============
CREATE OR REPLACE FUNCTION public.v2_expiry_status(_expiry date, _threshold_days integer DEFAULT 60)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN _expiry IS NULL THEN 'no_expiry'
    WHEN _expiry < CURRENT_DATE THEN 'expired'
    WHEN _expiry <= CURRENT_DATE + make_interval(days => GREATEST(_threshold_days,0)) THEN 'expiring_soon'
    ELSE 'valid' END
$$;
REVOKE ALL ON FUNCTION public.v2_expiry_status(date, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v2_expiry_status(date, integer) TO authenticated, service_role;

-- ============ system evidence (deterministic, no AI) ============
CREATE OR REPLACE FUNCTION public.v2_compliance_system_evidence(_organization_id uuid)
RETURNS TABLE(rule_code text, qualifies boolean, entity_type text, entity_id uuid, entity_reference text, detail jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT (public.v2_is_org_member(_organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid())) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  -- Rule 1: finished product traceable through production to raw-material suppliers
  RETURN QUERY
  SELECT 'SYS_TRACE_FG_TO_SUPPLIER'::text, true, 'finished_batch'::text, f.id, f.batch_reference,
         jsonb_build_object(
           'production_batch', pb.batch_reference,
           'supplier_count', count(DISTINCT rb.supplier_id),
           'raw_batches', jsonb_agg(DISTINCT rb.batch_reference))
  FROM public.v2_finished_product_batches f
  JOIN public.v2_production_batches pb ON pb.id = f.production_batch_id AND pb.status = 'completed'
  JOIN public.v2_production_inputs pi ON pi.production_batch_id = pb.id
  JOIN public.v2_raw_material_batches rb ON rb.id = pi.raw_material_batch_id AND rb.supplier_id IS NOT NULL
  WHERE f.organization_id = _organization_id
  GROUP BY f.id, f.batch_reference, pb.batch_reference;

  -- Rule 2: production batches document both inputs and outputs
  RETURN QUERY
  SELECT 'SYS_PRODUCTION_IO_RECORDS'::text, true, 'production_batch'::text, pb.id, pb.batch_reference,
         jsonb_build_object(
           'input_lines', (SELECT count(*) FROM public.v2_production_inputs i WHERE i.production_batch_id = pb.id),
           'output_lines', (SELECT count(*) FROM public.v2_production_outputs o WHERE o.production_batch_id = pb.id),
           'input_tonnes', pb.total_input_tonnes,
           'production_date', pb.production_date)
  FROM public.v2_production_batches pb
  WHERE pb.organization_id = _organization_id AND pb.status = 'completed'
    AND EXISTS (SELECT 1 FROM public.v2_production_inputs i WHERE i.production_batch_id = pb.id)
    AND EXISTS (SELECT 1 FROM public.v2_production_outputs o WHERE o.production_batch_id = pb.id);

  -- Rule 3: raw-material receipts are recorded against suppliers
  RETURN QUERY
  SELECT 'SYS_RAW_MATERIAL_RECEIPTS'::text, true, 'goods_receipt'::text, gr.id, gr.reference,
         jsonb_build_object('received_at', gr.received_at, 'accepted_tonnes', gr.accepted_tonnes,
                            'quality_result', gr.quality_result)
  FROM public.v2_goods_receipts gr
  WHERE gr.organization_id = _organization_id AND gr.supplier_id IS NOT NULL;

  -- Rule 4: finished lots are individually identifiable
  RETURN QUERY
  SELECT 'SYS_FINISHED_LOT_IDENTIFIABLE'::text, true, 'finished_batch'::text, f.id, f.batch_reference,
         jsonb_build_object('product_id', f.product_id, 'production_date', f.production_date,
                            'quantity', f.quantity_produced, 'unit_code', f.unit_code)
  FROM public.v2_finished_product_batches f
  WHERE f.organization_id = _organization_id AND coalesce(f.batch_reference,'') <> '';
END $$;
REVOKE ALL ON FUNCTION public.v2_compliance_system_evidence(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v2_compliance_system_evidence(uuid) TO authenticated, service_role;

-- ============ readiness ============
-- FORMULA (documented, deterministic):
--   weight(severity): critical=5, high=3, medium=2, low=1 (configurable per organization)
--   contribution: compliant=1.0, partially_compliant=0.5, non_compliant=0, not_assessed=0
--   not_applicable requirements are excluded from numerator AND denominator
--   readiness = 100 * SUM(weight*contribution) / SUM(weight)
-- GATING: any open critical gap (critical requirement not compliant, or open/in-progress
--   critical finding) caps the overall state at 'progressing', regardless of the score.
CREATE OR REPLACE FUNCTION public.v2_compliance_readiness(_organization_id uuid, _org_program_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _s record; _score numeric; _num numeric; _den numeric; _state text;
  _critical_req integer; _critical_find integer; _prog uuid; _r jsonb; _cats jsonb;
BEGIN
  IF NOT (public.v2_is_org_member(_organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid())) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  SELECT program_id INTO _prog FROM public.v2_org_compliance_programs
   WHERE id = _org_program_id AND organization_id = _organization_id;
  IF _prog IS NULL THEN RAISE EXCEPTION 'PROGRAM_NOT_FOUND'; END IF;

  SELECT COALESCE(cs.weight_critical,5) wc, COALESCE(cs.weight_high,3) wh,
         COALESCE(cs.weight_medium,2) wm, COALESCE(cs.weight_low,1) wl,
         COALESCE(cs.expiring_soon_days,60) days
    INTO _s
    FROM (SELECT 1) x LEFT JOIN public.v2_compliance_settings cs ON cs.organization_id = _organization_id;

  WITH req AS (
    SELECT r.id, r.category, r.severity,
           CASE r.severity WHEN 'critical' THEN _s.wc WHEN 'high' THEN _s.wh
                           WHEN 'medium' THEN _s.wm ELSE _s.wl END::numeric AS weight,
           COALESCE(a.response, 'not_assessed'::v2_assessment_response) AS response
      FROM public.v2_compliance_requirements r
      LEFT JOIN public.v2_compliance_assessments a
        ON a.requirement_id = r.id AND a.org_program_id = _org_program_id AND a.is_current
     WHERE r.program_id = _prog AND r.is_active
  ), scored AS (
    SELECT *, CASE response WHEN 'compliant' THEN 1.0 WHEN 'partially_compliant' THEN 0.5 ELSE 0.0 END::numeric AS contribution
      FROM req WHERE response <> 'not_applicable'
  )
  SELECT COALESCE(sum(weight*contribution),0), COALESCE(sum(weight),0) INTO _num, _den FROM scored;

  _score := CASE WHEN _den = 0 THEN 0 ELSE round(100*_num/_den, 1) END;

  SELECT count(*) INTO _critical_req FROM (
    SELECT r.id, COALESCE(a.response,'not_assessed'::v2_assessment_response) resp
      FROM public.v2_compliance_requirements r
      LEFT JOIN public.v2_compliance_assessments a
        ON a.requirement_id = r.id AND a.org_program_id = _org_program_id AND a.is_current
     WHERE r.program_id = _prog AND r.is_active AND r.severity = 'critical') q
   WHERE resp IN ('non_compliant','partially_compliant','not_assessed');

  SELECT count(*) INTO _critical_find FROM public.v2_compliance_findings
   WHERE organization_id = _organization_id AND org_program_id = _org_program_id
     AND severity = 'critical' AND status IN ('open','action_planned','in_progress');

  _state := CASE WHEN _score < 25 THEN 'early_stage'
                 WHEN _score < 50 THEN 'needs_work'
                 WHEN _score < 75 THEN 'progressing'
                 WHEN _score < 90 THEN 'near_ready'
                 ELSE 'ready_for_review' END;
  IF (_critical_req + _critical_find) > 0 AND _state IN ('near_ready','ready_for_review') THEN
    _state := 'progressing';
  END IF;

  SELECT COALESCE(jsonb_agg(c ORDER BY c->>'category'), '[]'::jsonb) INTO _cats FROM (
    SELECT jsonb_build_object(
      'category', r.category,
      'total', count(*),
      'assessed', count(*) FILTER (WHERE a.id IS NOT NULL AND a.response <> 'not_assessed'),
      'compliant', count(*) FILTER (WHERE a.response = 'compliant'),
      'partial', count(*) FILTER (WHERE a.response = 'partially_compliant'),
      'non_compliant', count(*) FILTER (WHERE a.response = 'non_compliant'),
      'not_applicable', count(*) FILTER (WHERE a.response = 'not_applicable')) AS c
    FROM public.v2_compliance_requirements r
    LEFT JOIN public.v2_compliance_assessments a
      ON a.requirement_id = r.id AND a.org_program_id = _org_program_id AND a.is_current
    WHERE r.program_id = _prog AND r.is_active
    GROUP BY r.category) s;

  SELECT jsonb_build_object(
    'org_program_id', _org_program_id,
    'program_id', _prog,
    'readiness', _score,
    'weighted_points', round(_num,2),
    'weighted_total', round(_den,2),
    'state', _state,
    'critical_gate', (_critical_req + _critical_find) > 0,
    'critical_requirement_gaps', _critical_req,
    'critical_open_findings', _critical_find,
    'weights', jsonb_build_object('critical', _s.wc, 'high', _s.wh, 'medium', _s.wm, 'low', _s.wl),
    'contribution_model', jsonb_build_object('compliant',1,'partially_compliant',0.5,'non_compliant',0,'not_assessed',0,'not_applicable','excluded'),
    'requirements_total', (SELECT count(*) FROM public.v2_compliance_requirements r WHERE r.program_id = _prog AND r.is_active),
    'requirements_assessed', (SELECT count(*) FROM public.v2_compliance_assessments a
        WHERE a.org_program_id = _org_program_id AND a.is_current AND a.response <> 'not_assessed'),
    'open_findings', (SELECT count(*) FROM public.v2_compliance_findings
        WHERE org_program_id = _org_program_id AND status IN ('open','action_planned','in_progress')),
    'open_actions', (SELECT count(*) FROM public.v2_compliance_actions a
        JOIN public.v2_compliance_findings f ON f.id = a.finding_id
        WHERE f.org_program_id = _org_program_id AND a.status IN ('open','in_progress')),
    'categories', _cats
  ) INTO _r;
  RETURN _r;
END $$;
REVOKE ALL ON FUNCTION public.v2_compliance_readiness(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v2_compliance_readiness(uuid, uuid) TO authenticated, service_role;

-- ============ dashboard ============
CREATE OR REPLACE FUNCTION public.v2_compliance_dashboard(_organization_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _days integer; _r jsonb;
BEGIN
  IF NOT (public.v2_is_org_member(_organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid())) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  SELECT COALESCE((SELECT expiring_soon_days FROM public.v2_compliance_settings WHERE organization_id = _organization_id), 60) INTO _days;

  SELECT jsonb_build_object(
    'expiring_soon_days', _days,
    'active_programs', (SELECT count(*) FROM public.v2_org_compliance_programs
        WHERE organization_id = _organization_id AND status IN ('not_started','in_progress','ready_for_review')),
    'programs', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'org_program_id', op.id, 'program_id', p.id, 'code', p.code,
          'name_fr', p.name_fr, 'name_en', p.name_en, 'status', op.status,
          'target_audit_date', op.target_audit_date,
          'readiness', (public.v2_compliance_readiness(_organization_id, op.id) ->> 'readiness')::numeric,
          'state', public.v2_compliance_readiness(_organization_id, op.id) ->> 'state',
          'critical_gate', (public.v2_compliance_readiness(_organization_id, op.id) ->> 'critical_gate')::boolean)
        ORDER BY p.sort_order)
      FROM public.v2_org_compliance_programs op
      JOIN public.v2_compliance_programs p ON p.id = op.program_id
      WHERE op.organization_id = _organization_id AND op.status <> 'archived'), '[]'::jsonb),
    'open_findings', (SELECT count(*) FROM public.v2_compliance_findings
        WHERE organization_id = _organization_id AND status IN ('open','action_planned','in_progress')),
    'critical_findings', (SELECT count(*) FROM public.v2_compliance_findings
        WHERE organization_id = _organization_id AND severity = 'critical' AND status IN ('open','action_planned','in_progress')),
    'open_actions', (SELECT count(*) FROM public.v2_compliance_actions
        WHERE organization_id = _organization_id AND status IN ('open','in_progress')),
    'actions_due_soon', (SELECT count(*) FROM public.v2_compliance_actions
        WHERE organization_id = _organization_id AND status IN ('open','in_progress')
          AND due_date IS NOT NULL AND due_date <= CURRENT_DATE + 14),
    'actions_overdue', (SELECT count(*) FROM public.v2_compliance_actions
        WHERE organization_id = _organization_id AND status IN ('open','in_progress')
          AND due_date IS NOT NULL AND due_date < CURRENT_DATE),
    'evidence_total', (SELECT count(*) FROM public.v2_compliance_evidence
        WHERE organization_id = _organization_id AND NOT is_archived),
    'system_evidence', (SELECT count(*) FROM public.v2_compliance_system_evidence(_organization_id) WHERE qualifies),
    'evidence_expired', (SELECT count(*) FROM public.v2_compliance_evidence
        WHERE organization_id = _organization_id AND NOT is_archived
          AND public.v2_expiry_status(expiry_date, _days) = 'expired'),
    'evidence_expiring_soon', (SELECT count(*) FROM public.v2_compliance_evidence
        WHERE organization_id = _organization_id AND NOT is_archived
          AND public.v2_expiry_status(expiry_date, _days) = 'expiring_soon'),
    'documents_expired', (SELECT count(*) FROM public.v2_compliance_document_versions v
        JOIN public.v2_compliance_documents d ON d.id = v.document_id AND NOT d.is_archived
        WHERE v.organization_id = _organization_id AND v.is_current
          AND public.v2_expiry_status(v.expiry_date, _days) = 'expired'),
    'documents_expiring_soon', (SELECT count(*) FROM public.v2_compliance_document_versions v
        JOIN public.v2_compliance_documents d ON d.id = v.document_id AND NOT d.is_archived
        WHERE v.organization_id = _organization_id AND v.is_current
          AND public.v2_expiry_status(v.expiry_date, _days) = 'expiring_soon'),
    'recent_assessments', COALESCE((SELECT jsonb_agg(x ORDER BY x->>'assessed_at' DESC) FROM (
        SELECT jsonb_build_object('id', a.id, 'requirement_code', r.code, 'title_fr', r.title_fr,
                                  'title_en', r.title_en, 'response', a.response, 'assessed_at', a.assessed_at) AS x
        FROM public.v2_compliance_assessments a
        JOIN public.v2_compliance_requirements r ON r.id = a.requirement_id
        WHERE a.organization_id = _organization_id
        ORDER BY a.assessed_at DESC LIMIT 8) s), '[]'::jsonb)
  ) INTO _r;
  RETURN _r;
END $$;
REVOKE ALL ON FUNCTION public.v2_compliance_dashboard(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v2_compliance_dashboard(uuid) TO authenticated, service_role;

-- ============ record an assessment (history preserved) ============
CREATE OR REPLACE FUNCTION public.v2_record_assessment(
  _org_program_id uuid, _requirement_id uuid, _response v2_assessment_response,
  _comment text DEFAULT NULL, _facility_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _org uuid; _req record; _aid uuid; _fid uuid;
BEGIN
  SELECT organization_id INTO _org FROM public.v2_org_compliance_programs WHERE id = _org_program_id;
  IF _org IS NULL THEN RAISE EXCEPTION 'PROGRAM_NOT_FOUND'; END IF;
  IF NOT public.v2_is_org_member(_org, auth.uid()) THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;
  SELECT * INTO _req FROM public.v2_compliance_requirements WHERE id = _requirement_id;
  IF _req IS NULL THEN RAISE EXCEPTION 'REQUIREMENT_NOT_FOUND'; END IF;

  INSERT INTO public.v2_compliance_assessments
    (organization_id, org_program_id, requirement_id, facility_id, response, comment, assessed_by)
  VALUES (_org, _org_program_id, _requirement_id, _facility_id, _response, _comment, auth.uid())
  RETURNING id INTO _aid;

  -- open a readiness gap when the answer is not compliant
  IF _response IN ('non_compliant','partially_compliant') THEN
    SELECT id INTO _fid FROM public.v2_compliance_findings
     WHERE org_program_id = _org_program_id AND requirement_id = _requirement_id
       AND status IN ('open','action_planned','in_progress') LIMIT 1;
    IF _fid IS NULL THEN
      INSERT INTO public.v2_compliance_findings
        (organization_id, facility_id, org_program_id, requirement_id, assessment_id, severity, title, description, status)
      VALUES (_org, _facility_id, _org_program_id, _requirement_id, _aid,
              CASE WHEN _response = 'non_compliant' THEN _req.severity
                   ELSE LEAST(_req.severity, 'high'::v2_compliance_severity) END,
              _req.title_fr, _req.description_fr, 'open')
      RETURNING id INTO _fid;
    END IF;
  ELSIF _response = 'compliant' THEN
    -- a reassessment closes the gap; the gap is never closed by an action alone
    UPDATE public.v2_compliance_findings
       SET status = 'resolved', resolved_at = now()
     WHERE org_program_id = _org_program_id AND requirement_id = _requirement_id
       AND status IN ('open','action_planned','in_progress');
  END IF;

  RETURN jsonb_build_object('assessment_id', _aid, 'finding_id', _fid, 'response', _response);
END $$;
REVOKE ALL ON FUNCTION public.v2_record_assessment(uuid, uuid, v2_assessment_response, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v2_record_assessment(uuid, uuid, v2_assessment_response, text, uuid) TO authenticated, service_role;

-- ============ corrective action completion (never changes compliance status) ============
CREATE OR REPLACE FUNCTION public.v2_complete_action(_action_id uuid, _note text DEFAULT NULL, _evidence_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _org uuid; _finding uuid;
BEGIN
  SELECT organization_id, finding_id INTO _org, _finding FROM public.v2_compliance_actions WHERE id = _action_id;
  IF _org IS NULL THEN RAISE EXCEPTION 'ACTION_NOT_FOUND'; END IF;
  IF NOT public.v2_is_org_member(_org, auth.uid()) THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;

  UPDATE public.v2_compliance_actions
     SET status = 'completed', completion_note = COALESCE(_note, completion_note),
         completion_evidence_id = COALESCE(_evidence_id, completion_evidence_id), completed_at = now()
   WHERE id = _action_id;

  -- The finding only moves forward in its workflow. Requirement status is untouched:
  -- a reassessment is always required to become compliant again.
  UPDATE public.v2_compliance_findings SET status = 'in_progress'
   WHERE id = _finding AND status IN ('open','action_planned');

  RETURN jsonb_build_object('action_id', _action_id, 'status', 'completed',
                            'requirement_status_changed', false, 'reassessment_required', true);
END $$;
REVOKE ALL ON FUNCTION public.v2_complete_action(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v2_complete_action(uuid, text, uuid) TO authenticated, service_role;

-- ============ non-destructive document versioning ============
CREATE OR REPLACE FUNCTION public.v2_add_document_version(
  _document_id uuid, _storage_path text, _file_name text,
  _issue_date date DEFAULT NULL, _expiry_date date DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _org uuid; _next integer; _vid uuid;
BEGIN
  SELECT organization_id INTO _org FROM public.v2_compliance_documents WHERE id = _document_id;
  IF _org IS NULL THEN RAISE EXCEPTION 'DOCUMENT_NOT_FOUND'; END IF;
  IF NOT public.v2_is_org_member(_org, auth.uid()) THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;
  SELECT COALESCE(max(version_number),0)+1 INTO _next FROM public.v2_compliance_document_versions WHERE document_id = _document_id;
  INSERT INTO public.v2_compliance_document_versions
    (organization_id, document_id, version_number, storage_path, file_name, issue_date, expiry_date, notes, uploaded_by)
  VALUES (_org, _document_id, _next, _storage_path, _file_name, _issue_date, _expiry_date, _notes, auth.uid())
  RETURNING id INTO _vid;
  RETURN jsonb_build_object('version_id', _vid, 'version_number', _next);
END $$;
REVOKE ALL ON FUNCTION public.v2_add_document_version(uuid, text, text, date, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v2_add_document_version(uuid, text, text, date, date, text) TO authenticated, service_role;

-- ============ audit preparation pack ============
CREATE OR REPLACE FUNCTION public.v2_compliance_audit_pack(_organization_id uuid, _org_program_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _r jsonb; _days integer; _prog uuid;
BEGIN
  IF NOT (public.v2_is_org_member(_organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid())) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  SELECT program_id INTO _prog FROM public.v2_org_compliance_programs
   WHERE id = _org_program_id AND organization_id = _organization_id;
  IF _prog IS NULL THEN RAISE EXCEPTION 'PROGRAM_NOT_FOUND'; END IF;
  SELECT COALESCE((SELECT expiring_soon_days FROM public.v2_compliance_settings WHERE organization_id = _organization_id), 60) INTO _days;

  SELECT jsonb_build_object(
    'generated_at', now(),
    'company', (SELECT to_jsonb(o) - 'created_by' FROM public.v2_organizations o WHERE o.id = _organization_id),
    'facility', (SELECT to_jsonb(f) FROM public.v2_processing_facilities f
                  WHERE f.id = (SELECT facility_id FROM public.v2_org_compliance_programs WHERE id = _org_program_id)),
    'program', (SELECT to_jsonb(p) FROM public.v2_compliance_programs p WHERE p.id = _prog),
    'activation', (SELECT to_jsonb(op) FROM public.v2_org_compliance_programs op WHERE op.id = _org_program_id),
    'readiness', public.v2_compliance_readiness(_organization_id, _org_program_id),
    'requirements', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'requirement_id', r.id, 'code', r.code, 'category', r.category, 'severity', r.severity,
          'title_fr', r.title_fr, 'title_en', r.title_en, 'scope', r.scope,
          'response', COALESCE(a.response,'not_assessed'::v2_assessment_response),
          'assessed_at', a.assessed_at, 'comment', a.comment,
          'system_evidence_rule', r.system_evidence_rule,
          'evidence_count', (SELECT count(*) FROM public.v2_compliance_evidence e
              WHERE e.requirement_id = r.id AND e.organization_id = _organization_id AND NOT e.is_archived))
        ORDER BY r.category, r.sort_order)
      FROM public.v2_compliance_requirements r
      LEFT JOIN public.v2_compliance_assessments a
        ON a.requirement_id = r.id AND a.org_program_id = _org_program_id AND a.is_current
      WHERE r.program_id = _prog AND r.is_active), '[]'::jsonb),
    'evidence_index', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'id', e.id, 'title', e.title, 'type', e.evidence_type, 'source', e.source,
          'requirement_code', r.code, 'issue_date', e.issue_date, 'expiry_date', e.expiry_date,
          'expiry_status', public.v2_expiry_status(e.expiry_date, _days),
          'related_entity_type', e.related_entity_type, 'related_entity_id', e.related_entity_id,
          'related_entity_reference', e.related_entity_reference) ORDER BY e.uploaded_at DESC)
      FROM public.v2_compliance_evidence e
      LEFT JOIN public.v2_compliance_requirements r ON r.id = e.requirement_id
      WHERE e.organization_id = _organization_id AND NOT e.is_archived), '[]'::jsonb),
    'open_findings', COALESCE((SELECT jsonb_agg(to_jsonb(f) ORDER BY f.severity DESC, f.created_at)
      FROM public.v2_compliance_findings f
      WHERE f.organization_id = _organization_id AND f.status IN ('open','action_planned','in_progress')), '[]'::jsonb),
    'actions', COALESCE((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.due_date NULLS LAST)
      FROM public.v2_compliance_actions a
      WHERE a.organization_id = _organization_id AND a.status <> 'cancelled'), '[]'::jsonb),
    'system_evidence', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'rule_code', rule_code, 'qualifies', qualifies, 'entity_type', entity_type,
          'entity_id', entity_id, 'entity_reference', entity_reference, 'detail', detail))
      FROM public.v2_compliance_system_evidence(_organization_id)), '[]'::jsonb),
    'documents', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'id', d.id, 'title', d.title, 'category', d.category, 'current_version', d.current_version,
          'versions', (SELECT count(*) FROM public.v2_compliance_document_versions v WHERE v.document_id = d.id),
          'expiry_date', (SELECT v.expiry_date FROM public.v2_compliance_document_versions v WHERE v.document_id = d.id AND v.is_current),
          'expiry_status', public.v2_expiry_status((SELECT v.expiry_date FROM public.v2_compliance_document_versions v
              WHERE v.document_id = d.id AND v.is_current), _days)) ORDER BY d.title)
      FROM public.v2_compliance_documents d
      WHERE d.organization_id = _organization_id AND NOT d.is_archived), '[]'::jsonb),
    'missing_evidence', COALESCE((SELECT jsonb_agg(jsonb_build_object('code', r.code, 'title_fr', r.title_fr, 'title_en', r.title_en))
      FROM public.v2_compliance_requirements r
      LEFT JOIN public.v2_compliance_assessments a
        ON a.requirement_id = r.id AND a.org_program_id = _org_program_id AND a.is_current
      WHERE r.program_id = _prog AND r.is_active
        AND r.requirement_type IN ('document_required','photo_required','date_required')
        AND COALESCE(a.response,'not_assessed'::v2_assessment_response) <> 'not_applicable'
        AND NOT EXISTS (SELECT 1 FROM public.v2_compliance_evidence e
            WHERE e.requirement_id = r.id AND e.organization_id = _organization_id AND NOT e.is_archived)), '[]'::jsonb)
  ) INTO _r;
  RETURN _r;
END $$;
REVOKE ALL ON FUNCTION public.v2_compliance_audit_pack(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v2_compliance_audit_pack(uuid, uuid) TO authenticated, service_role;