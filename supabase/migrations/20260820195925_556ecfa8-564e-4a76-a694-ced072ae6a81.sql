CREATE OR REPLACE FUNCTION public.v2_finance_history(_organization_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn_hist$
DECLARE _first date; _months numeric; _r jsonb;
BEGIN
  IF NOT (public.v2_is_org_member(_organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid())) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  SELECT min(d) INTO _first FROM (
    SELECT min(created_at)::date d FROM public.v2_sourcing_requests WHERE organization_id = _organization_id
    UNION ALL SELECT min(created_at)::date FROM public.v2_procurement_orders WHERE organization_id = _organization_id
    UNION ALL SELECT min(received_at)::date FROM public.v2_goods_receipts WHERE organization_id = _organization_id
    UNION ALL SELECT min(production_date) FROM public.v2_production_batches WHERE organization_id = _organization_id
    UNION ALL SELECT min(order_date) FROM public.v2_sales_orders WHERE organization_id = _organization_id
    UNION ALL SELECT min(payment_date) FROM public.v2_customer_payments WHERE organization_id = _organization_id
    UNION ALL SELECT min(expense_date) FROM public.v2_expenses WHERE organization_id = _organization_id
  ) s;

  _months := CASE WHEN _first IS NULL THEN 0 ELSE round(((current_date - _first)::numeric / 30.0), 1) END;

  SELECT jsonb_build_object(
    'first_activity_date', _first,
    'as_of', current_date,
    'months_of_history', _months,
    'maturity', CASE WHEN _first IS NULL THEN 'none'
                     WHEN _months < 1 THEN 'lt_1_month'
                     WHEN _months < 3 THEN 'm1_3'
                     WHEN _months < 6 THEN 'm3_6'
                     WHEN _months < 12 THEN 'm6_12'
                     ELSE 'm12_plus' END,
    'months_with_procurement', (SELECT count(DISTINCT date_trunc('month', received_at)) FROM public.v2_goods_receipts WHERE organization_id = _organization_id),
    'months_with_production', (SELECT count(DISTINCT date_trunc('month', production_date)) FROM public.v2_production_batches WHERE organization_id = _organization_id AND status = 'completed'),
    'months_with_sales', (SELECT count(DISTINCT date_trunc('month', order_date)) FROM public.v2_sales_orders WHERE organization_id = _organization_id AND status <> 'cancelled'),
    'months_with_payments', (SELECT count(DISTINCT date_trunc('month', payment_date)) FROM public.v2_customer_payments WHERE organization_id = _organization_id AND NOT is_reversal),
    'months_with_expenses', (SELECT count(DISTINCT date_trunc('month', expense_date)) FROM public.v2_expenses WHERE organization_id = _organization_id),
    'active_months', (SELECT count(DISTINCT m) FROM (
        SELECT date_trunc('month', received_at) m FROM public.v2_goods_receipts WHERE organization_id = _organization_id
        UNION ALL SELECT date_trunc('month', production_date) FROM public.v2_production_batches WHERE organization_id = _organization_id AND status = 'completed'
        UNION ALL SELECT date_trunc('month', order_date) FROM public.v2_sales_orders WHERE organization_id = _organization_id AND status <> 'cancelled'
        UNION ALL SELECT date_trunc('month', payment_date) FROM public.v2_customer_payments WHERE organization_id = _organization_id AND NOT is_reversal
        UNION ALL SELECT date_trunc('month', expense_date) FROM public.v2_expenses WHERE organization_id = _organization_id) a)
  ) INTO _r;
  RETURN _r;
END $fn_hist$;

CREATE OR REPLACE FUNCTION public.v2_finance_snapshot(_organization_id uuid, _months integer DEFAULT 12)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn_snap$
DECLARE _r jsonb; _from date; _hist jsonb; _sales_total numeric; _collected numeric;
BEGIN
  IF NOT (public.v2_is_org_member(_organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid())) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  _from := current_date - (GREATEST(_months, 1) * 31);
  _hist := public.v2_finance_history(_organization_id);

  SELECT COALESCE(sum(total_amount), 0) INTO _sales_total FROM public.v2_sales_orders
   WHERE organization_id = _organization_id AND status <> 'cancelled' AND order_date >= _from;
  SELECT COALESCE(sum(CASE WHEN is_reversal THEN -amount ELSE amount END), 0) INTO _collected
    FROM public.v2_customer_payments WHERE organization_id = _organization_id AND payment_date >= _from;

  SELECT jsonb_build_object(
    'generated_at', now(),
    'period_from', _from,
    'period_to', current_date,
    'currency', 'XOF',
    'history', _hist,
    'business', (SELECT jsonb_build_object(
        'organization_id', o.id, 'name', o.name, 'legal_name', o.legal_name, 'country', o.country,
        'region', o.region, 'city', o.city, 'created_at', o.created_at,
        'trade_name', p.trade_name, 'legal_form', p.legal_form, 'rccm', p.rccm, 'ifu', p.ifu,
        'year_established', p.year_established, 'business_phone', p.business_phone,
        'business_email', p.business_email, 'employees_count', p.employees_count,
        'value_chains', to_jsonb(p.value_chains), 'onboarding_completed', p.onboarding_completed,
        'source', 'agrigrid_processor_profile')
      FROM public.v2_organizations o
      LEFT JOIN public.v2_processor_profiles p ON p.organization_id = o.id
      WHERE o.id = _organization_id),
    'facilities', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', f.id, 'name', f.name, 'department', f.department, 'commune', f.commune,
        'capacity_value', f.processing_capacity_value, 'capacity_unit', f.processing_capacity_unit,
        'capacity_period', f.processing_capacity_period, 'is_main', f.is_main) ORDER BY f.is_main DESC)
      FROM public.v2_processing_facilities f WHERE f.organization_id = _organization_id), '[]'::jsonb),
    'products', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', pp.id, 'name', pp.product_name, 'category', pp.category, 'unit', pp.default_production_unit))
      FROM public.v2_processed_products pp WHERE pp.organization_id = _organization_id AND COALESCE(pp.is_active, true)), '[]'::jsonb),
    'raw_material_needs', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'crop', COALESCE(c.name_en, n.crop), 'quantity', n.quantity, 'unit', COALESCE(n.unit_code, n.unit), 'frequency', n.frequency))
      FROM public.v2_raw_material_needs n LEFT JOIN public.v2_crops c ON c.id = n.crop_id
      WHERE n.organization_id = _organization_id), '[]'::jsonb),
    'sourcing', (SELECT jsonb_build_object(
        'source', 'agrigrid_sourcing',
        'requests', count(*),
        'requested_tonnes', COALESCE(round(sum(public.v2_to_tonnes(sr.requested_quantity, sr.unit_code)), 3), 0))
      FROM public.v2_sourcing_requests sr WHERE sr.organization_id = _organization_id),
    'procurement', jsonb_build_object(
        'source', 'agrigrid_procurement',
        'orders', (SELECT count(*) FROM public.v2_procurement_orders WHERE organization_id = _organization_id AND status <> 'cancelled'),
        'ordered_tonnes', COALESCE((SELECT round(sum(l.ordered_tonnes), 3) FROM public.v2_procurement_order_lines l
            JOIN public.v2_procurement_orders o ON o.id = l.order_id
            WHERE o.organization_id = _organization_id AND o.status <> 'cancelled'), 0),
        'received_tonnes', COALESCE((SELECT round(sum(delivered_tonnes), 3) FROM public.v2_goods_receipts WHERE organization_id = _organization_id), 0),
        'accepted_tonnes', COALESCE((SELECT round(sum(accepted_tonnes), 3) FROM public.v2_goods_receipts WHERE organization_id = _organization_id), 0),
        'rejected_tonnes', COALESCE((SELECT round(sum(rejected_tonnes), 3) FROM public.v2_goods_receipts WHERE organization_id = _organization_id), 0),
        'procurement_value', COALESCE((SELECT round(sum(total_expected_amount), 2) FROM public.v2_procurement_orders
            WHERE organization_id = _organization_id AND status <> 'cancelled'), 0),
        'active_suppliers', COALESCE((SELECT count(DISTINCT supplier_id) FROM public.v2_procurement_orders
            WHERE organization_id = _organization_id AND status <> 'cancelled'), 0),
        'repeat_suppliers', COALESCE((SELECT count(*) FROM (SELECT supplier_id FROM public.v2_procurement_orders
            WHERE organization_id = _organization_id AND status <> 'cancelled'
            GROUP BY supplier_id HAVING count(*) > 1) q), 0),
        'fulfilment_rate', (SELECT CASE WHEN sum(l.ordered_tonnes) > 0
            THEN round(100 * COALESCE((SELECT sum(accepted_tonnes) FROM public.v2_goods_receipts WHERE organization_id = _organization_id), 0)
                 / sum(l.ordered_tonnes), 1) END
            FROM public.v2_procurement_order_lines l JOIN public.v2_procurement_orders o ON o.id = l.order_id
            WHERE o.organization_id = _organization_id AND o.status <> 'cancelled')),
    'supplier_concentration', COALESCE((SELECT jsonb_agg(x ORDER BY (x->>'share')::numeric DESC) FROM (
        SELECT jsonb_build_object('supplier', s.display_name, 'value', round(t.v, 2),
                 'share', round(100 * t.v / NULLIF(sum(t.v) OVER (), 0), 1)) x
          FROM (SELECT supplier_id, sum(total_expected_amount) v FROM public.v2_procurement_orders
                 WHERE organization_id = _organization_id AND status <> 'cancelled' GROUP BY supplier_id) t
          JOIN public.v2_suppliers s ON s.id = t.supplier_id) q), '[]'::jsonb),
    'production', jsonb_build_object(
        'source', 'agrigrid_production',
        'batches', (SELECT count(*) FROM public.v2_production_batches WHERE organization_id = _organization_id AND status = 'completed'),
        'input_tonnes', COALESCE((SELECT round(sum(total_input_tonnes), 3) FROM public.v2_production_batches
            WHERE organization_id = _organization_id AND status = 'completed'), 0),
        'outputs_by_unit', COALESCE((SELECT jsonb_agg(jsonb_build_object('unit_code', unit_code, 'quantity', qty)) FROM (
            SELECT o.unit_code, round(sum(o.quantity), 3) qty FROM public.v2_production_outputs o
              JOIN public.v2_production_batches b ON b.id = o.production_batch_id
             WHERE b.organization_id = _organization_id AND b.status = 'completed' AND o.output_type = 'finished_product'
             GROUP BY o.unit_code) s), '[]'::jsonb),
        'loss_by_unit', COALESCE((SELECT jsonb_agg(jsonb_build_object('unit_code', unit_code, 'quantity', qty)) FROM (
            SELECT o.unit_code, round(sum(o.quantity), 3) qty FROM public.v2_production_outputs o
              JOIN public.v2_production_batches b ON b.id = o.production_batch_id
             WHERE b.organization_id = _organization_id AND b.status = 'completed' AND o.output_type IN ('waste','rejected_output')
             GROUP BY o.unit_code) s), '[]'::jsonb)),
    'sales', jsonb_build_object(
        'source', 'agrigrid_sales', 'currency', 'XOF',
        'orders', (SELECT count(*) FROM public.v2_sales_orders WHERE organization_id = _organization_id AND status <> 'cancelled' AND order_date >= _from),
        'value', round(_sales_total, 2),
        'average_order_value', (SELECT CASE WHEN count(*) > 0 THEN round(_sales_total / count(*), 2) END FROM public.v2_sales_orders
            WHERE organization_id = _organization_id AND status <> 'cancelled' AND order_date >= _from),
        'customers', (SELECT count(DISTINCT customer_id) FROM public.v2_sales_orders WHERE organization_id = _organization_id AND status <> 'cancelled'),
        'repeat_customers', (SELECT count(*) FROM (SELECT customer_id FROM public.v2_sales_orders
            WHERE organization_id = _organization_id AND status <> 'cancelled' GROUP BY customer_id HAVING count(*) > 1) q),
        'quantities_by_unit', COALESCE((SELECT jsonb_agg(jsonb_build_object('unit_code', unit_code, 'quantity', qty)) FROM (
            SELECT l.unit_code, round(sum(l.quantity), 3) qty FROM public.v2_sales_order_lines l
              JOIN public.v2_sales_orders o ON o.id = l.sales_order_id
             WHERE o.organization_id = _organization_id AND o.status <> 'cancelled' GROUP BY l.unit_code) s), '[]'::jsonb)),
    'customer_concentration', COALESCE((SELECT jsonb_agg(x ORDER BY (x->>'share')::numeric DESC) FROM (
        SELECT jsonb_build_object('customer', c.display_name, 'value', round(t.v, 2),
                 'share', round(100 * t.v / NULLIF(sum(t.v) OVER (), 0), 1)) x
          FROM (SELECT customer_id, sum(total_amount) v FROM public.v2_sales_orders
                 WHERE organization_id = _organization_id AND status <> 'cancelled' GROUP BY customer_id) t
          JOIN public.v2_customers c ON c.id = t.customer_id) q), '[]'::jsonb),
    'collections', jsonb_build_object(
        'source', 'agrigrid_payments', 'currency', 'XOF',
        'payments', (SELECT count(*) FROM public.v2_customer_payments WHERE organization_id = _organization_id AND NOT is_reversal),
        'reversals', (SELECT count(*) FROM public.v2_customer_payments WHERE organization_id = _organization_id AND is_reversal),
        'sales_recorded', round(_sales_total, 2),
        'cash_collected', round(_collected, 2),
        'outstanding_receivables', COALESCE((SELECT round(sum(total_amount - paid_amount), 2) FROM public.v2_sales_orders
            WHERE organization_id = _organization_id AND status <> 'cancelled' AND total_amount > paid_amount), 0),
        'collection_ratio', CASE WHEN _sales_total > 0 THEN round(100 * _collected / _sales_total, 1) END),
    'expenses', jsonb_build_object(
        'source', 'agrigrid_expenses_and_procurement', 'currency', 'XOF',
        'procurement_expenditure', COALESCE((SELECT round(sum(total_expected_amount), 2) FROM public.v2_procurement_orders
            WHERE organization_id = _organization_id AND status <> 'cancelled'), 0),
        'other_operating_expenses', COALESCE((SELECT round(sum(amount), 2) FROM public.v2_expenses
            WHERE organization_id = _organization_id AND category <> 'raw_materials'), 0),
        'records', (SELECT count(*) FROM public.v2_expenses WHERE organization_id = _organization_id),
        'by_category', COALESCE((SELECT jsonb_agg(jsonb_build_object('category', category, 'amount', amt)) FROM (
            SELECT category::text, round(sum(amount), 2) amt FROM public.v2_expenses
             WHERE organization_id = _organization_id AND category <> 'raw_materials' GROUP BY category) s), '[]'::jsonb),
        'note', 'procurement_excluded_from_other_expenses'),
    'inventory', jsonb_build_object(
        'source', 'agrigrid_inventory_ledger',
        'raw_material_tonnes', COALESCE((SELECT round(sum(current_tonnes), 3) FROM public.v2_raw_material_batches
            WHERE organization_id = _organization_id), 0),
        'raw_material_by_crop', COALESCE((SELECT jsonb_agg(jsonb_build_object('crop', crop, 'tonnes', t)) FROM (
            SELECT COALESCE(c.name_en, 'n/a') crop, round(sum(b.current_tonnes), 3) t
              FROM public.v2_raw_material_batches b LEFT JOIN public.v2_crops c ON c.id = b.crop_id
             WHERE b.organization_id = _organization_id GROUP BY c.name_en HAVING sum(b.current_tonnes) > 0) s), '[]'::jsonb),
        'raw_material_value', (SELECT round(sum(b.current_tonnes * p.avg_price), 2) FROM public.v2_raw_material_batches b
            JOIN (SELECT l.crop_id, sum(l.line_amount) / NULLIF(sum(l.ordered_tonnes), 0) avg_price
                    FROM public.v2_procurement_order_lines l JOIN public.v2_procurement_orders o ON o.id = l.order_id
                   WHERE o.organization_id = _organization_id AND o.status <> 'cancelled' GROUP BY l.crop_id) p
              ON p.crop_id = b.crop_id
           WHERE b.organization_id = _organization_id),
        'valuation_method', 'weighted_average_recorded_procurement_price_per_tonne',
        'finished_goods', COALESCE((SELECT jsonb_agg(jsonb_build_object('unit_code', unit_code, 'quantity', qty)) FROM (
            SELECT f.unit_code, round(sum(m.quantity), 3) qty FROM public.v2_finished_goods_movements m
              JOIN public.v2_finished_product_batches f ON f.id = m.finished_batch_id
             WHERE m.organization_id = _organization_id GROUP BY f.unit_code HAVING round(sum(m.quantity), 3) <> 0) s), '[]'::jsonb)),
    'cash', jsonb_build_object(
        'accounts_configured', (SELECT count(*) FROM public.v2_cash_accounts WHERE organization_id = _organization_id AND is_active),
        'accounts_with_opening_balance', (SELECT count(*) FROM public.v2_cash_accounts
            WHERE organization_id = _organization_id AND is_active AND opening_balance IS NOT NULL),
        'recorded_movements', (SELECT count(*) FROM public.v2_cash_movements WHERE organization_id = _organization_id),
        'note', 'recorded_cash_movements_only_not_a_certified_balance'),
    'monthly', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'month', to_char(m, 'YYYY-MM'),
          'procurement_value', COALESCE((SELECT round(sum(total_expected_amount), 2) FROM public.v2_procurement_orders
              WHERE organization_id = _organization_id AND status <> 'cancelled' AND date_trunc('month', created_at) = m), 0),
          'received_tonnes', COALESCE((SELECT round(sum(accepted_tonnes), 3) FROM public.v2_goods_receipts
              WHERE organization_id = _organization_id AND date_trunc('month', received_at) = m), 0),
          'production_batches', (SELECT count(*) FROM public.v2_production_batches
              WHERE organization_id = _organization_id AND status = 'completed' AND date_trunc('month', production_date) = m),
          'sales_value', COALESCE((SELECT round(sum(total_amount), 2) FROM public.v2_sales_orders
              WHERE organization_id = _organization_id AND status <> 'cancelled' AND date_trunc('month', order_date) = m), 0),
          'collections', COALESCE((SELECT round(sum(CASE WHEN is_reversal THEN -amount ELSE amount END), 2) FROM public.v2_customer_payments
              WHERE organization_id = _organization_id AND date_trunc('month', payment_date) = m), 0),
          'expenses', COALESCE((SELECT round(sum(amount), 2) FROM public.v2_expenses
              WHERE organization_id = _organization_id AND category <> 'raw_materials' AND date_trunc('month', expense_date) = m), 0)
        ) ORDER BY m)
      FROM generate_series(
        date_trunc('month', COALESCE((_hist->>'first_activity_date')::date, current_date)),
        date_trunc('month', current_date), interval '1 month') m), '[]'::jsonb),
    'compliance', COALESCE((SELECT jsonb_build_object(
        'source', 'agrigrid_compliance',
        'active_programs', count(*),
        'programs', jsonb_agg(jsonb_build_object('org_program_id', op.id, 'program_code', pr.code,
            'name_fr', pr.name_fr, 'name_en', pr.name_en, 'status', op.status)))
      FROM public.v2_org_compliance_programs op JOIN public.v2_compliance_programs pr ON pr.id = op.program_id
      WHERE op.organization_id = _organization_id AND op.status <> 'archived'),
      jsonb_build_object('source', 'agrigrid_compliance', 'active_programs', 0, 'programs', '[]'::jsonb)),
    'financing_request', (SELECT jsonb_build_object(
        'id', fp.id, 'purpose', fp.financing_purpose, 'financing_type', fp.financing_type,
        'requested_amount', fp.requested_amount, 'currency', fp.currency, 'tenor_months', fp.tenor_months,
        'own_contribution', fp.own_contribution, 'target_date', fp.target_date, 'status', fp.status,
        'intended_use', fp.intended_use, 'is_demo', fp.is_demo,
        'use_of_funds', COALESCE((SELECT jsonb_agg(jsonb_build_object('category', u.category, 'label', u.label, 'amount', u.amount) ORDER BY u.sort_order)
            FROM public.v2_finance_use_of_funds u WHERE u.finance_profile_id = fp.id), '[]'::jsonb),
        'use_of_funds_total', COALESCE((SELECT round(sum(amount), 2) FROM public.v2_finance_use_of_funds WHERE finance_profile_id = fp.id), 0),
        'reconciles', COALESCE((SELECT round(sum(amount), 2) FROM public.v2_finance_use_of_funds WHERE finance_profile_id = fp.id), 0)
                      = round(COALESCE(fp.requested_amount, -1), 2))
      FROM public.v2_finance_profiles fp WHERE fp.organization_id = _organization_id)
  ) INTO _r;
  RETURN _r;
END $fn_snap$;

CREATE OR REPLACE FUNCTION public.v2_finance_documents_status(_organization_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn_docs$
DECLARE _r jsonb;
BEGIN
  IF NOT (public.v2_is_org_member(_organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid())) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  SELECT jsonb_agg(x ORDER BY (x->>'sort_order')::int) INTO _r FROM (
    SELECT jsonb_build_object(
      'code', dr.code, 'category', dr.category, 'importance', dr.importance,
      'name_fr', dr.name_fr, 'name_en', dr.name_en,
      'description_fr', dr.description_fr, 'description_en', dr.description_en,
      'suggested_document_category', dr.suggested_document_category,
      'sort_order', dr.sort_order,
      'available', EXISTS (SELECT 1 FROM public.v2_finance_document_links fl
                            WHERE fl.organization_id = _organization_id AND fl.requirement_code = dr.code),
      'linked_documents', COALESCE((SELECT jsonb_agg(jsonb_build_object(
              'link_id', fl.id, 'document_id', d.id, 'title', d.title, 'category', d.category,
              'current_version', d.current_version, 'source', 'compliance_document_library'))
          FROM public.v2_finance_document_links fl
          LEFT JOIN public.v2_compliance_documents d ON d.id = fl.document_id
         WHERE fl.organization_id = _organization_id AND fl.requirement_code = dr.code), '[]'::jsonb)
    ) x
    FROM public.v2_finance_document_requirements dr
    WHERE dr.is_active
  ) q;
  RETURN COALESCE(_r, '[]'::jsonb);
END $fn_docs$;

CREATE OR REPLACE FUNCTION public.v2_finance_readiness(_organization_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn_ready$
DECLARE
  _snap jsonb; _docs jsonb; _hist jsonb; _w jsonb; _dims jsonb := '[]'::jsonb;
  _num numeric := 0; _den numeric := 0; _score numeric; _state text; _quals jsonb := '[]'::jsonb;
  _s numeric; _req_total int; _req_ok int; _rec_total int; _rec_ok int;
  _compliance numeric := 0; _op jsonb; _months numeric;
  _biz_checks int := 10; _biz_ok int := 0; _b jsonb;
BEGIN
  IF NOT (public.v2_is_org_member(_organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid())) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  _snap := public.v2_finance_snapshot(_organization_id, 12);
  _docs := public.v2_finance_documents_status(_organization_id);
  _hist := _snap->'history';
  _months := COALESCE((_hist->>'months_of_history')::numeric, 0);

  SELECT COALESCE(fs.weights, '{}'::jsonb) INTO _w FROM (SELECT 1) x
    LEFT JOIN public.v2_finance_settings fs ON fs.organization_id = _organization_id;
  _w := jsonb_build_object(
    'business_identity', COALESCE((_w->>'business_identity')::numeric, 10),
    'legal_documents', COALESCE((_w->>'legal_documents')::numeric, 15),
    'operating_history', COALESCE((_w->>'operating_history')::numeric, 15),
    'sales_records', COALESCE((_w->>'sales_records')::numeric, 15),
    'payment_records', COALESCE((_w->>'payment_records')::numeric, 10),
    'expense_records', COALESCE((_w->>'expense_records')::numeric, 10),
    'inventory_records', COALESCE((_w->>'inventory_records')::numeric, 5),
    'compliance', COALESCE((_w->>'compliance')::numeric, 10),
    'financing_request', COALESCE((_w->>'financing_request')::numeric, 10));

  _b := _snap->'business';
  _biz_ok :=
      (CASE WHEN COALESCE(_b->>'legal_name', _b->>'name') IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN _b->>'trade_name' IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN _b->>'legal_form' IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN _b->>'rccm' IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN _b->>'ifu' IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN _b->>'year_established' IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN COALESCE(_b->>'business_phone', _b->>'business_email') IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN jsonb_array_length(_snap->'facilities') > 0 THEN 1 ELSE 0 END)
    + (CASE WHEN jsonb_array_length(_snap->'products') > 0 THEN 1 ELSE 0 END)
    + (CASE WHEN jsonb_array_length(_snap->'raw_material_needs') > 0 THEN 1 ELSE 0 END);
  _s := round(100.0 * _biz_ok / _biz_checks, 1);
  _dims := _dims || jsonb_build_array(jsonb_build_object(
    'key', 'business_identity', 'weight', _w->'business_identity', 'score', _s,
    'source', 'agrigrid_processor_profile',
    'facts', jsonb_build_object('checks_passed', _biz_ok, 'checks_total', _biz_checks),
    'missing', (SELECT COALESCE(jsonb_agg(k), '[]'::jsonb) FROM (
        SELECT 'legal_form' k WHERE _b->>'legal_form' IS NULL
        UNION ALL SELECT 'rccm' WHERE _b->>'rccm' IS NULL
        UNION ALL SELECT 'ifu' WHERE _b->>'ifu' IS NULL
        UNION ALL SELECT 'year_established' WHERE _b->>'year_established' IS NULL
        UNION ALL SELECT 'trade_name' WHERE _b->>'trade_name' IS NULL
        UNION ALL SELECT 'facility' WHERE jsonb_array_length(_snap->'facilities') = 0
        UNION ALL SELECT 'product' WHERE jsonb_array_length(_snap->'products') = 0
        UNION ALL SELECT 'raw_material_need' WHERE jsonb_array_length(_snap->'raw_material_needs') = 0) m)));
  _num := _num + (_w->>'business_identity')::numeric * _s; _den := _den + (_w->>'business_identity')::numeric;

  SELECT count(*) FILTER (WHERE d->>'importance' = 'required'),
         count(*) FILTER (WHERE d->>'importance' = 'required' AND (d->>'available')::boolean),
         count(*) FILTER (WHERE d->>'importance' = 'recommended'),
         count(*) FILTER (WHERE d->>'importance' = 'recommended' AND (d->>'available')::boolean)
    INTO _req_total, _req_ok, _rec_total, _rec_ok
    FROM jsonb_array_elements(_docs) d;
  _s := round(100.0 * (0.75 * COALESCE(_req_ok::numeric / NULLIF(_req_total, 0), 0)
                     + 0.25 * COALESCE(_rec_ok::numeric / NULLIF(_rec_total, 0), 0)), 1);
  _dims := _dims || jsonb_build_array(jsonb_build_object(
    'key', 'legal_documents', 'weight', _w->'legal_documents', 'score', _s,
    'source', 'business_documents',
    'facts', jsonb_build_object('required_available', _req_ok, 'required_total', _req_total,
                                'recommended_available', _rec_ok, 'recommended_total', _rec_total),
    'missing', (SELECT COALESCE(jsonb_agg(d->>'code'), '[]'::jsonb) FROM jsonb_array_elements(_docs) d
                 WHERE d->>'importance' = 'required' AND NOT (d->>'available')::boolean)));
  _num := _num + (_w->>'legal_documents')::numeric * _s; _den := _den + (_w->>'legal_documents')::numeric;

  _s := round(100.0 * LEAST(1, COALESCE((_hist->>'active_months')::numeric, 0) / 6.0), 1);
  _dims := _dims || jsonb_build_array(jsonb_build_object(
    'key', 'operating_history', 'weight', _w->'operating_history', 'score', _s,
    'source', 'agrigrid_operations',
    'facts', jsonb_build_object('active_months', _hist->'active_months', 'months_of_history', _months,
                                'maturity', _hist->'maturity', 'target_months', 6),
    'missing', CASE WHEN COALESCE((_hist->>'active_months')::numeric, 0) < 6
                    THEN jsonb_build_array('longer_operating_history') ELSE '[]'::jsonb END));
  _num := _num + (_w->>'operating_history')::numeric * _s; _den := _den + (_w->>'operating_history')::numeric;

  _op := _snap->'sales';
  _s := round(100.0 * (
      0.50 * LEAST(1, COALESCE((_op->>'orders')::numeric, 0) / 10.0)
    + 0.25 * LEAST(1, COALESCE((_op->>'customers')::numeric, 0) / 3.0)
    + 0.25 * LEAST(1, COALESCE((_hist->>'months_with_sales')::numeric, 0) / 3.0)), 1);
  _dims := _dims || jsonb_build_array(jsonb_build_object(
    'key', 'sales_records', 'weight', _w->'sales_records', 'score', _s, 'source', 'agrigrid_sales',
    'facts', jsonb_build_object('orders', _op->'orders', 'customers', _op->'customers',
                                'months_with_sales', _hist->'months_with_sales', 'value', _op->'value'),
    'missing', (SELECT COALESCE(jsonb_agg(k), '[]'::jsonb) FROM (
        SELECT 'more_recorded_sales' k WHERE COALESCE((_op->>'orders')::numeric, 0) < 10
        UNION ALL SELECT 'more_customers' WHERE COALESCE((_op->>'customers')::numeric, 0) < 3
        UNION ALL SELECT 'longer_sales_history' WHERE COALESCE((_hist->>'months_with_sales')::numeric, 0) < 3) m)));
  _num := _num + (_w->>'sales_records')::numeric * _s; _den := _den + (_w->>'sales_records')::numeric;

  _op := _snap->'collections';
  _s := round(100.0 * (
      0.50 * LEAST(1, COALESCE((_op->>'payments')::numeric, 0) / 5.0)
    + 0.25 * CASE WHEN (_op->>'collection_ratio') IS NOT NULL THEN 1 ELSE 0 END
    + 0.25 * LEAST(1, COALESCE((_hist->>'months_with_payments')::numeric, 0) / 3.0)), 1);
  _dims := _dims || jsonb_build_array(jsonb_build_object(
    'key', 'payment_records', 'weight', _w->'payment_records', 'score', _s, 'source', 'agrigrid_payments',
    'facts', jsonb_build_object('payments', _op->'payments', 'cash_collected', _op->'cash_collected',
                                'outstanding', _op->'outstanding_receivables', 'collection_ratio', _op->'collection_ratio',
                                'months_with_payments', _hist->'months_with_payments'),
    'missing', (SELECT COALESCE(jsonb_agg(k), '[]'::jsonb) FROM (
        SELECT 'more_recorded_payments' k WHERE COALESCE((_op->>'payments')::numeric, 0) < 5
        UNION ALL SELECT 'longer_payment_history' WHERE COALESCE((_hist->>'months_with_payments')::numeric, 0) < 3) m)));
  _num := _num + (_w->>'payment_records')::numeric * _s; _den := _den + (_w->>'payment_records')::numeric;

  _op := _snap->'expenses';
  _s := round(100.0 * (
      0.60 * LEAST(1, COALESCE((_op->>'records')::numeric, 0) / 6.0)
    + 0.40 * LEAST(1, jsonb_array_length(_op->'by_category')::numeric / 3.0)), 1);
  _dims := _dims || jsonb_build_array(jsonb_build_object(
    'key', 'expense_records', 'weight', _w->'expense_records', 'score', _s, 'source', 'agrigrid_expenses',
    'facts', jsonb_build_object('records', _op->'records', 'categories', jsonb_array_length(_op->'by_category'),
                                'other_operating_expenses', _op->'other_operating_expenses',
                                'procurement_expenditure', _op->'procurement_expenditure'),
    'missing', (SELECT COALESCE(jsonb_agg(k), '[]'::jsonb) FROM (
        SELECT 'more_expense_records' k WHERE COALESCE((_op->>'records')::numeric, 0) < 6
        UNION ALL SELECT 'more_expense_categories' WHERE jsonb_array_length(_op->'by_category') < 3) m)));
  _num := _num + (_w->>'expense_records')::numeric * _s; _den := _den + (_w->>'expense_records')::numeric;

  _op := _snap->'inventory';
  _s := round(100.0 * (
      0.50 * CASE WHEN COALESCE((_op->>'raw_material_tonnes')::numeric, 0) > 0 THEN 1 ELSE 0 END
    + 0.30 * CASE WHEN jsonb_array_length(_op->'finished_goods') > 0 THEN 1 ELSE 0 END
    + 0.20 * CASE WHEN (_op->>'raw_material_value') IS NOT NULL THEN 1 ELSE 0 END), 1);
  _dims := _dims || jsonb_build_array(jsonb_build_object(
    'key', 'inventory_records', 'weight', _w->'inventory_records', 'score', _s, 'source', 'agrigrid_inventory_ledger',
    'facts', jsonb_build_object('raw_material_tonnes', _op->'raw_material_tonnes',
                                'raw_material_value', _op->'raw_material_value',
                                'finished_goods', _op->'finished_goods'),
    'missing', (SELECT COALESCE(jsonb_agg(k), '[]'::jsonb) FROM (
        SELECT 'raw_material_stock_records' k WHERE COALESCE((_op->>'raw_material_tonnes')::numeric, 0) = 0
        UNION ALL SELECT 'finished_goods_records' WHERE jsonb_array_length(_op->'finished_goods') = 0) m)));
  _num := _num + (_w->>'inventory_records')::numeric * _s; _den := _den + (_w->>'inventory_records')::numeric;

  SELECT COALESCE(max((public.v2_compliance_readiness(_organization_id, op2.id)->>'readiness')::numeric), 0)
    INTO _compliance
    FROM public.v2_org_compliance_programs op2
   WHERE op2.organization_id = _organization_id AND op2.status <> 'archived';
  _s := round(COALESCE(_compliance, 0), 1);
  _dims := _dims || jsonb_build_array(jsonb_build_object(
    'key', 'compliance', 'weight', _w->'compliance', 'score', _s, 'source', 'agrigrid_compliance',
    'facts', jsonb_build_object('active_programs', _snap->'compliance'->'active_programs', 'best_readiness', _s),
    'missing', CASE WHEN COALESCE((_snap->'compliance'->>'active_programs')::int, 0) = 0
                    THEN jsonb_build_array('activate_compliance_programme')
                    WHEN _s < 100 THEN jsonb_build_array('complete_compliance_assessment') ELSE '[]'::jsonb END));
  _num := _num + (_w->>'compliance')::numeric * _s; _den := _den + (_w->>'compliance')::numeric;

  _op := _snap->'financing_request';
  _s := round(100.0 * (
      0.20 * CASE WHEN _op IS NOT NULL THEN 1 ELSE 0 END
    + 0.25 * CASE WHEN COALESCE((_op->>'requested_amount')::numeric, 0) > 0 THEN 1 ELSE 0 END
    + 0.20 * CASE WHEN (_op->>'purpose') IS NOT NULL AND (_op->>'tenor_months') IS NOT NULL THEN 1 ELSE 0 END
    + 0.35 * CASE WHEN COALESCE((_op->>'reconciles')::boolean, false) THEN 1 ELSE 0 END), 1);
  _dims := _dims || jsonb_build_array(jsonb_build_object(
    'key', 'financing_request', 'weight', _w->'financing_request', 'score', _s, 'source', 'declared_by_business',
    'facts', jsonb_build_object('requested_amount', _op->'requested_amount', 'currency', _op->'currency',
                                'purpose', _op->'purpose', 'tenor_months', _op->'tenor_months',
                                'use_of_funds_total', _op->'use_of_funds_total', 'reconciles', _op->'reconciles'),
    'missing', (SELECT COALESCE(jsonb_agg(k), '[]'::jsonb) FROM (
        SELECT 'financing_request' k WHERE _op IS NULL
        UNION ALL SELECT 'requested_amount' WHERE COALESCE((_op->>'requested_amount')::numeric, 0) = 0
        UNION ALL SELECT 'purpose_or_tenor' WHERE (_op->>'purpose') IS NULL OR (_op->>'tenor_months') IS NULL
        UNION ALL SELECT 'use_of_funds_reconciliation' WHERE NOT COALESCE((_op->>'reconciles')::boolean, false)) m)));
  _num := _num + (_w->>'financing_request')::numeric * _s; _den := _den + (_w->>'financing_request')::numeric;

  _score := CASE WHEN _den = 0 THEN 0 ELSE round(_num / _den, 1) END;

  IF _months < 3 THEN _quals := _quals || jsonb_build_array('short_operating_history'); END IF;
  IF _req_ok < _req_total THEN _quals := _quals || jsonb_build_array('required_documents_missing'); END IF;
  IF COALESCE((_snap->'collections'->>'payments')::int, 0) = 0 THEN _quals := _quals || jsonb_build_array('no_recorded_customer_payments'); END IF;
  IF COALESCE((_snap->'sales'->>'orders')::int, 0) = 0 THEN _quals := _quals || jsonb_build_array('no_recorded_sales'); END IF;
  IF COALESCE((_snap->'cash'->>'accounts_with_opening_balance')::int, 0) = 0 THEN _quals := _quals || jsonb_build_array('cash_data_incomplete'); END IF;
  IF COALESCE((_snap->'compliance'->>'active_programs')::int, 0) = 0 THEN _quals := _quals || jsonb_build_array('no_compliance_programme'); END IF;
  IF _snap->'financing_request' IS NULL THEN _quals := _quals || jsonb_build_array('no_financing_request'); END IF;

  _state := CASE WHEN _score < 25 THEN 'early'
                 WHEN _score < 50 THEN 'building_record'
                 WHEN _score < 70 THEN 'structured'
                 WHEN _score < 85 THEN 'dossier_ready'
                 ELSE 'ready_for_review' END;
  IF _months < 3 AND _state IN ('dossier_ready', 'ready_for_review') THEN _state := 'building_record'; END IF;
  IF (_req_ok < _req_total OR COALESCE((_snap->'collections'->>'payments')::int, 0) = 0)
     AND _state IN ('dossier_ready', 'ready_for_review') THEN _state := 'structured'; END IF;

  RETURN jsonb_build_object(
    'generated_at', now(),
    'organization_id', _organization_id,
    'readiness', _score,
    'state', _state,
    'weights', _w,
    'formula', 'readiness = SUM(weight_d * score_d) / SUM(weight_d); each dimension score is a deterministic 0-100 record completeness ratio. This is not a credit score.',
    'dimensions', _dims,
    'qualifiers', _quals,
    'history', _hist,
    'documents', _docs,
    'disclaimer', 'finance_readiness_is_not_a_credit_score');
END $fn_ready$;

CREATE OR REPLACE FUNCTION public.v2_finance_dossier(_organization_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn_dos$
DECLARE _r jsonb; _snap jsonb; _ready jsonb;
BEGIN
  IF NOT (public.v2_is_org_member(_organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid())) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  _snap := public.v2_finance_snapshot(_organization_id, 12);
  _ready := public.v2_finance_readiness(_organization_id);

  SELECT jsonb_build_object(
    'generated_at', now(),
    'snapshot', _snap,
    'readiness', _ready,
    'suppliers', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'name', s.display_name, 'type', s.supplier_type, 'department', s.department,
          'commune', s.commune, 'status', s.status, 'source', 'agrigrid_supplier_network'))
        FROM (SELECT DISTINCT supplier_id FROM public.v2_procurement_orders
               WHERE organization_id = _organization_id AND status <> 'cancelled') t
        JOIN public.v2_suppliers s ON s.id = t.supplier_id), '[]'::jsonb),
    'system_evidence', jsonb_build_object(
      'SYSTEM_PROCUREMENT_HISTORY', jsonb_build_object('records',
          (SELECT count(*) FROM public.v2_goods_receipts WHERE organization_id = _organization_id), 'source', 'agrigrid_procurement'),
      'SYSTEM_PRODUCTION_HISTORY', jsonb_build_object('records',
          (SELECT count(*) FROM public.v2_production_batches WHERE organization_id = _organization_id AND status = 'completed'), 'source', 'agrigrid_production'),
      'SYSTEM_SALES_HISTORY', jsonb_build_object('records',
          (SELECT count(*) FROM public.v2_sales_orders WHERE organization_id = _organization_id AND status <> 'cancelled'), 'source', 'agrigrid_sales'),
      'SYSTEM_PAYMENT_HISTORY', jsonb_build_object('records',
          (SELECT count(*) FROM public.v2_customer_payments WHERE organization_id = _organization_id), 'source', 'agrigrid_payments'),
      'SYSTEM_INVENTORY', jsonb_build_object('records',
          (SELECT count(*) FROM public.v2_raw_material_batches WHERE organization_id = _organization_id), 'source', 'agrigrid_inventory_ledger'),
      'SYSTEM_TRACEABILITY', jsonb_build_object('records',
          (SELECT count(*) FROM public.v2_finished_product_batches WHERE organization_id = _organization_id), 'source', 'agrigrid_operations'),
      'SYSTEM_COMPLIANCE', jsonb_build_object('records',
          (SELECT count(*) FROM public.v2_org_compliance_programs WHERE organization_id = _organization_id AND status <> 'archived'), 'source', 'agrigrid_compliance'),
      'SYSTEM_DOCUMENT', jsonb_build_object('records',
          (SELECT count(*) FROM public.v2_finance_document_links WHERE organization_id = _organization_id), 'source', 'business_documents')),
    'data_quality', jsonb_build_object('flags', _ready->'qualifiers', 'history', _snap->'history'),
    'disclaimer', 'dossier_not_audited_not_a_credit_rating'
  ) INTO _r;
  RETURN _r;
END $fn_dos$;

CREATE OR REPLACE FUNCTION public.v2_create_finance_share(
  _organization_id uuid,
  _recipient_type public.v2_finance_recipient_type,
  _recipient_name text,
  _scopes public.v2_finance_share_scope[],
  _expires_in_days integer DEFAULT 30,
  _recipient_email text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn_share$
DECLARE _token text; _id uuid; _profile uuid;
BEGIN
  IF NOT public.v2_is_org_admin(_organization_id, auth.uid()) THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;
  IF _scopes IS NULL OR array_length(_scopes, 1) IS NULL THEN RAISE EXCEPTION 'SCOPE_REQUIRED'; END IF;
  IF COALESCE(_expires_in_days, 0) < 1 OR _expires_in_days > 180 THEN RAISE EXCEPTION 'INVALID_EXPIRY'; END IF;

  SELECT id INTO _profile FROM public.v2_finance_profiles WHERE organization_id = _organization_id;
  _token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO public.v2_finance_shares(organization_id, finance_profile_id, recipient_type, recipient_name,
      recipient_email, scopes, token_hash, expires_at, created_by)
  VALUES (_organization_id, _profile, _recipient_type, _recipient_name, _recipient_email, _scopes,
      encode(digest(_token, 'sha256'), 'hex'), now() + make_interval(days => _expires_in_days), auth.uid())
  RETURNING id INTO _id;

  RETURN jsonb_build_object('share_id', _id, 'token', _token,
    'expires_at', (SELECT expires_at FROM public.v2_finance_shares WHERE id = _id), 'scopes', to_jsonb(_scopes));
END $fn_share$;

CREATE OR REPLACE FUNCTION public.v2_revoke_finance_share(_share_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn_revoke$
DECLARE _org uuid;
BEGIN
  SELECT organization_id INTO _org FROM public.v2_finance_shares WHERE id = _share_id;
  IF _org IS NULL THEN RAISE EXCEPTION 'SHARE_NOT_FOUND'; END IF;
  IF NOT public.v2_is_org_admin(_org, auth.uid()) THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;
  UPDATE public.v2_finance_shares SET revoked_at = now(), revoked_by = auth.uid()
   WHERE id = _share_id AND revoked_at IS NULL;
  RETURN jsonb_build_object('share_id', _share_id, 'revoked', true);
END $fn_revoke$;

CREATE OR REPLACE FUNCTION public.v2_finance_shared_dossier(_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn_shared$
DECLARE _sh record; _full jsonb; _out jsonb; _scopes text[];
BEGIN
  SELECT * INTO _sh FROM public.v2_finance_shares
   WHERE token_hash = encode(digest(COALESCE(_token, ''), 'sha256'), 'hex');
  IF _sh.id IS NULL THEN RAISE EXCEPTION 'SHARE_NOT_FOUND'; END IF;
  IF _sh.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'SHARE_REVOKED'; END IF;
  IF _sh.expires_at <= now() THEN RAISE EXCEPTION 'SHARE_EXPIRED'; END IF;

  _scopes := ARRAY(SELECT unnest(_sh.scopes)::text);
  _full := public.v2_finance_dossier(_sh.organization_id);

  _out := jsonb_build_object(
    'shared_by', (SELECT name FROM public.v2_organizations WHERE id = _sh.organization_id),
    'recipient', _sh.recipient_name,
    'scopes', to_jsonb(_scopes),
    'expires_at', _sh.expires_at,
    'generated_at', now(),
    'disclaimer', 'dossier_not_audited_not_a_credit_rating');

  IF 'full_dossier' = ANY(_scopes) THEN
    _out := _out || jsonb_build_object('dossier', _full);
  ELSE
    IF 'business_profile' = ANY(_scopes) THEN
      _out := _out || jsonb_build_object('business', _full->'snapshot'->'business',
                                         'facilities', _full->'snapshot'->'facilities',
                                         'products', _full->'snapshot'->'products');
    END IF;
    IF 'operating_metrics' = ANY(_scopes) THEN
      _out := _out || jsonb_build_object('sourcing', _full->'snapshot'->'sourcing',
                                         'procurement', _full->'snapshot'->'procurement',
                                         'production', _full->'snapshot'->'production',
                                         'inventory', _full->'snapshot'->'inventory',
                                         'monthly', _full->'snapshot'->'monthly');
    END IF;
    IF 'sales_summary' = ANY(_scopes) THEN
      _out := _out || jsonb_build_object('sales', _full->'snapshot'->'sales',
                                         'collections', _full->'snapshot'->'collections');
    END IF;
    IF 'documents' = ANY(_scopes) THEN
      _out := _out || jsonb_build_object('documents', _full->'readiness'->'documents');
    END IF;
    IF 'compliance_summary' = ANY(_scopes) THEN
      _out := _out || jsonb_build_object('compliance', _full->'snapshot'->'compliance');
    END IF;
  END IF;

  UPDATE public.v2_finance_shares
     SET last_accessed_at = now(), access_count = access_count + 1 WHERE id = _sh.id;
  INSERT INTO public.v2_finance_events(organization_id, event_type, entity_type, entity_id, actor_id, payload)
  VALUES (_sh.organization_id, 'finance_share_accessed', 'finance_share', _sh.id, auth.uid(),
          jsonb_build_object('recipient', _sh.recipient_name));
  RETURN _out;
END $fn_shared$;

REVOKE ALL ON FUNCTION public.v2_log_finance_event() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.v2_finance_history(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.v2_finance_snapshot(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.v2_finance_documents_status(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.v2_finance_readiness(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.v2_finance_dossier(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.v2_create_finance_share(uuid, public.v2_finance_recipient_type, text, public.v2_finance_share_scope[], integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.v2_revoke_finance_share(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.v2_finance_shared_dossier(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.v2_finance_history(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v2_finance_snapshot(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v2_finance_documents_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v2_finance_readiness(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v2_finance_dossier(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v2_create_finance_share(uuid, public.v2_finance_recipient_type, text, public.v2_finance_share_scope[], integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v2_revoke_finance_share(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v2_finance_shared_dossier(text) TO authenticated;