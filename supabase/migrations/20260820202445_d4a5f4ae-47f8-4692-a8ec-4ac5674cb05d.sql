DO $mig$
DECLARE d text; d0 text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO d FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'v2_finance_snapshot';
  d0 := d;

  d := replace(d,
'  IF NOT (public.v2_is_org_member(_organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid())) THEN',
'  IF NOT public.v2_finance_can_read(_organization_id) THEN');

  d := replace(d,
'DECLARE _r jsonb; _from date; _hist jsonb; _sales_total numeric; _collected numeric;',
'DECLARE _r jsonb; _from date; _hist jsonb; _sales_total numeric; _collected numeric;
        _curs text[]; _multi boolean; _cur text; _sales_by_cur jsonb; _coll_by_cur jsonb;');

  d := replace(d,
'  SELECT COALESCE(sum(total_amount), 0) INTO _sales_total FROM public.v2_sales_orders
   WHERE organization_id = _organization_id AND status <> ''cancelled'' AND order_date >= _from;
  SELECT COALESCE(sum(CASE WHEN is_reversal THEN -amount ELSE amount END), 0) INTO _collected
    FROM public.v2_customer_payments WHERE organization_id = _organization_id AND payment_date >= _from;',
'  -- CURRENCY SAFETY: no FX rates are held, so values are never summed across currencies.
  SELECT array_agg(DISTINCT c) INTO _curs FROM (
    SELECT COALESCE(currency, ''XOF'') c FROM public.v2_sales_orders WHERE organization_id = _organization_id AND status <> ''cancelled''
    UNION ALL SELECT COALESCE(currency, ''XOF'') FROM public.v2_customer_payments WHERE organization_id = _organization_id
    UNION ALL SELECT COALESCE(currency, ''XOF'') FROM public.v2_expenses WHERE organization_id = _organization_id
    UNION ALL SELECT COALESCE(currency, ''XOF'') FROM public.v2_procurement_orders WHERE organization_id = _organization_id AND status <> ''cancelled'') q;
  _multi := COALESCE(array_length(_curs, 1), 0) > 1;
  _cur := CASE WHEN _multi THEN NULL ELSE COALESCE(_curs[1], ''XOF'') END;

  SELECT jsonb_agg(jsonb_build_object(''currency'', c, ''value'', v) ORDER BY c) INTO _sales_by_cur FROM (
    SELECT COALESCE(currency, ''XOF'') c, round(sum(total_amount), 2) v FROM public.v2_sales_orders
     WHERE organization_id = _organization_id AND status <> ''cancelled'' AND order_date >= _from GROUP BY 1) q;
  SELECT jsonb_agg(jsonb_build_object(''currency'', c, ''value'', v) ORDER BY c) INTO _coll_by_cur FROM (
    SELECT COALESCE(currency, ''XOF'') c, round(sum(CASE WHEN is_reversal THEN -amount ELSE amount END), 2) v
      FROM public.v2_customer_payments WHERE organization_id = _organization_id AND payment_date >= _from GROUP BY 1) q;

  IF _multi THEN
    _sales_total := NULL; _collected := NULL;
  ELSE
    SELECT COALESCE(sum(total_amount), 0) INTO _sales_total FROM public.v2_sales_orders
     WHERE organization_id = _organization_id AND status <> ''cancelled'' AND order_date >= _from;
    SELECT COALESCE(sum(CASE WHEN is_reversal THEN -amount ELSE amount END), 0) INTO _collected
      FROM public.v2_customer_payments WHERE organization_id = _organization_id AND payment_date >= _from;
  END IF;');

  d := replace(d,
'    ''currency'', ''XOF'',
',
'    ''currency'', _cur,
    ''currencies'', to_jsonb(COALESCE(_curs, ARRAY[''XOF''])),
    ''multi_currency'', _multi,
    ''aggregation_note'', CASE WHEN _multi
      THEN ''multiple_currencies_recorded_no_fx_conversion_totals_reported_per_currency''
      ELSE ''single_currency_recorded'' END,
');

  d := replace(d,
'        ''source'', ''agrigrid_sales'', ''currency'', ''XOF'',',
'        ''source'', ''agrigrid_sales'', ''currency'', _cur, ''multi_currency'', _multi,
        ''by_currency'', COALESCE(_sales_by_cur, ''[]''::jsonb),');

  d := replace(d,
'        ''source'', ''agrigrid_payments'', ''currency'', ''XOF'',',
'        ''source'', ''agrigrid_payments'', ''currency'', _cur, ''multi_currency'', _multi,
        ''by_currency'', COALESCE(_coll_by_cur, ''[]''::jsonb),');

  d := replace(d,
'        ''source'', ''agrigrid_expenses_and_procurement'', ''currency'', ''XOF'',',
'        ''source'', ''agrigrid_expenses_and_procurement'', ''currency'', _cur, ''multi_currency'', _multi,
        ''by_currency'', COALESCE((SELECT jsonb_agg(jsonb_build_object(''currency'', c, ''value'', v) ORDER BY c) FROM (
            SELECT COALESCE(currency, ''XOF'') c, round(sum(amount), 2) v FROM public.v2_expenses
             WHERE organization_id = _organization_id AND category <> ''raw_materials'' GROUP BY 1) q), ''[]''::jsonb),');

  d := replace(d,
'        ''procurement_value'', COALESCE((SELECT round(sum(total_expected_amount), 2) FROM public.v2_procurement_orders
            WHERE organization_id = _organization_id AND status <> ''cancelled''), 0),',
'        ''procurement_value'', CASE WHEN _multi THEN NULL ELSE COALESCE((SELECT round(sum(total_expected_amount), 2) FROM public.v2_procurement_orders
            WHERE organization_id = _organization_id AND status <> ''cancelled''), 0) END,
        ''procurement_value_by_currency'', COALESCE((SELECT jsonb_agg(jsonb_build_object(''currency'', c, ''value'', v) ORDER BY c) FROM (
            SELECT COALESCE(currency, ''XOF'') c, round(sum(total_expected_amount), 2) v FROM public.v2_procurement_orders
             WHERE organization_id = _organization_id AND status <> ''cancelled'' GROUP BY 1) q), ''[]''::jsonb),');

  IF d = d0 OR d NOT LIKE '%v2_finance_can_read%' OR d NOT LIKE '%_sales_by_cur%' THEN
    RAISE EXCEPTION 'snapshot patch did not apply';
  END IF;
  EXECUTE d;
END $mig$;

-- Same guard swap for the remaining finance read functions, preserving their bodies.
DO $mig2$
DECLARE r record; d text; d0 text;
BEGIN
  FOR r IN SELECT p.oid, p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public'
              AND p.proname IN ('v2_finance_history','v2_finance_readiness','v2_finance_dossier')
  LOOP
    d0 := pg_get_functiondef(r.oid);
    d := replace(d0,
'  IF NOT (public.v2_is_org_member(_organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid())) THEN',
'  IF NOT public.v2_finance_can_read(_organization_id) THEN');
    IF d = d0 THEN
      RAISE EXCEPTION 'guard patch did not apply to %', r.proname;
    END IF;
    EXECUTE d;
  END LOOP;
END $mig2$;

-- The shared (token) dossier grants a transaction-local, single-organisation read context
-- resolved from the hashed token itself. It confers no membership and no table access.
DO $mig3$
DECLARE d text; d0 text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO d0 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'v2_finance_shared_dossier';
  d := replace(d0,
'  _full := public.v2_finance_dossier(_sh.organization_id);',
'  PERFORM set_config(''agrigrid.finance_share_org'', _sh.organization_id::text, true);
  _full := public.v2_finance_dossier(_sh.organization_id);
  PERFORM set_config(''agrigrid.finance_share_org'', '''', true);');
  IF d = d0 THEN
    RAISE EXCEPTION 'shared dossier patch did not apply';
  END IF;
  EXECUTE d;
END $mig3$;