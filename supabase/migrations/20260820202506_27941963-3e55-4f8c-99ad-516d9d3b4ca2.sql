CREATE OR REPLACE FUNCTION public.v2_finance_documents_status(_organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _r jsonb;
BEGIN
  IF NOT public.v2_finance_can_read(_organization_id) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  -- A checklist line is satisfied ONCE: `available` is an EXISTS over linked documents,
  -- so five attachments on one requirement contribute exactly as much as one.
  -- An expired current version does NOT satisfy a requirement.
  SELECT jsonb_agg(x ORDER BY (x->>'sort_order')::int) INTO _r FROM (
    SELECT jsonb_build_object(
      'code', dr.code, 'category', dr.category, 'importance', dr.importance,
      'name_fr', dr.name_fr, 'name_en', dr.name_en,
      'description_fr', dr.description_fr, 'description_en', dr.description_en,
      'suggested_document_category', dr.suggested_document_category,
      'sort_order', dr.sort_order,
      'available', EXISTS (
          SELECT 1 FROM public.v2_finance_document_links fl
            JOIN public.v2_compliance_documents d ON d.id = fl.document_id
            LEFT JOIN public.v2_compliance_document_versions v
                   ON v.document_id = d.id AND v.is_current
           WHERE fl.organization_id = _organization_id AND fl.requirement_code = dr.code
             AND NOT COALESCE(d.is_archived, false)
             AND public.v2_expiry_status(v.expiry_date) <> 'expired'),
      'linked_but_expired', EXISTS (
          SELECT 1 FROM public.v2_finance_document_links fl
            JOIN public.v2_compliance_documents d ON d.id = fl.document_id
            JOIN public.v2_compliance_document_versions v
                   ON v.document_id = d.id AND v.is_current
           WHERE fl.organization_id = _organization_id AND fl.requirement_code = dr.code
             AND public.v2_expiry_status(v.expiry_date) = 'expired'),
      'linked_documents', COALESCE((SELECT jsonb_agg(jsonb_build_object(
              'link_id', fl.id, 'document_id', d.id, 'title', d.title, 'category', d.category,
              'current_version', d.current_version,
              'issue_date', v.issue_date, 'expiry_date', v.expiry_date,
              'expiry_status', public.v2_expiry_status(v.expiry_date),
              'is_archived', COALESCE(d.is_archived, false),
              'source', 'compliance_document_library'))
          FROM public.v2_finance_document_links fl
          LEFT JOIN public.v2_compliance_documents d ON d.id = fl.document_id
          LEFT JOIN public.v2_compliance_document_versions v ON v.document_id = d.id AND v.is_current
         WHERE fl.organization_id = _organization_id AND fl.requirement_code = dr.code), '[]'::jsonb)
    ) x
    FROM public.v2_finance_document_requirements dr
    WHERE dr.is_active
  ) q;
  RETURN COALESCE(_r, '[]'::jsonb);
END $function$;

CREATE OR REPLACE FUNCTION public.v2_finance_uof_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _row record;
BEGIN
  _row := COALESCE(NEW, OLD);
  INSERT INTO public.v2_finance_events(organization_id, event_type, entity_type, entity_id, actor_id, payload)
  VALUES (_row.organization_id, 'finance_use_of_funds_' || lower(TG_OP), 'finance_use_of_funds', _row.id, auth.uid(),
          jsonb_build_object('category', _row.category, 'label', _row.label,
                             'old_amount', CASE WHEN TG_OP <> 'INSERT' THEN OLD.amount END,
                             'new_amount', CASE WHEN TG_OP <> 'DELETE' THEN NEW.amount END));
  RETURN _row;
END $function$;

DROP TRIGGER IF EXISTS v2_finance_uof_audit ON public.v2_finance_use_of_funds;
CREATE TRIGGER v2_finance_uof_audit
AFTER INSERT OR UPDATE OR DELETE ON public.v2_finance_use_of_funds
FOR EACH ROW EXECUTE FUNCTION public.v2_finance_uof_audit();