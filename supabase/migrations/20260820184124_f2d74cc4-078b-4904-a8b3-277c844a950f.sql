-- AGRI-GRID V2 — Phase 2A (2/2): production, finished goods, traceability

-- ============ readable references ============
CREATE TABLE IF NOT EXISTS public.v2_reference_counters (
  prefix text NOT NULL,
  year integer NOT NULL,
  current_value bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (prefix, year)
);
GRANT SELECT ON public.v2_reference_counters TO authenticated;
GRANT ALL ON public.v2_reference_counters TO service_role;
ALTER TABLE public.v2_reference_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "counters readable by authenticated" ON public.v2_reference_counters FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.v2_next_reference(_prefix text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _y integer := EXTRACT(YEAR FROM now())::int; _n bigint;
BEGIN
  INSERT INTO public.v2_reference_counters (prefix, year, current_value)
  VALUES (_prefix, _y, 1)
  ON CONFLICT (prefix, year) DO UPDATE SET current_value = public.v2_reference_counters.current_value + 1
  RETURNING current_value INTO _n;
  RETURN _prefix || '-' || _y::text || '-' || lpad(_n::text, 6, '0');
END $$;
REVOKE ALL ON FUNCTION public.v2_next_reference(text) FROM PUBLIC, anon;

-- ============ recipes ============
CREATE TABLE public.v2_production_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.v2_processed_products(id) ON DELETE SET NULL,
  name text NOT NULL,
  reference_input_quantity numeric NOT NULL DEFAULT 100,
  reference_input_unit text NOT NULL DEFAULT 'kg',
  expected_output_quantity numeric,
  expected_output_unit text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.v2_production_recipe_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.v2_production_recipes(id) ON DELETE CASCADE,
  crop_id uuid REFERENCES public.v2_crops(id),
  variety_id uuid REFERENCES public.v2_crop_varieties(id),
  quantity numeric NOT NULL,
  unit_code text NOT NULL DEFAULT 'kg',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.v2_production_recipe_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.v2_production_recipes(id) ON DELETE CASCADE,
  output_type public.v2_production_output_type NOT NULL DEFAULT 'finished_product',
  product_id uuid REFERENCES public.v2_processed_products(id) ON DELETE SET NULL,
  label text,
  quantity numeric NOT NULL,
  unit_code text NOT NULL DEFAULT 'kg',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ production batches ============
CREATE TABLE public.v2_production_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_reference text NOT NULL UNIQUE,
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES public.v2_processing_facilities(id) ON DELETE SET NULL,
  recipe_id uuid REFERENCES public.v2_production_recipes(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.v2_processed_products(id) ON DELETE SET NULL,
  production_date date NOT NULL DEFAULT CURRENT_DATE,
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  responsible_user_id uuid,
  status public.v2_production_status NOT NULL DEFAULT 'draft',
  total_input_tonnes numeric NOT NULL DEFAULT 0,
  void_reason text,
  voided_at timestamptz,
  voided_by uuid,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.v2_production_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_batch_id uuid NOT NULL REFERENCES public.v2_production_batches(id) ON DELETE CASCADE,
  raw_material_batch_id uuid NOT NULL REFERENCES public.v2_raw_material_batches(id),
  crop_id uuid REFERENCES public.v2_crops(id),
  variety_id uuid REFERENCES public.v2_crop_varieties(id),
  quantity_tonnes numeric NOT NULL CHECK (quantity_tonnes > 0),
  unit_code text NOT NULL DEFAULT 't',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.v2_finished_product_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_reference text NOT NULL UNIQUE,
  product_id uuid REFERENCES public.v2_processed_products(id) ON DELETE SET NULL,
  production_batch_id uuid NOT NULL REFERENCES public.v2_production_batches(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES public.v2_processing_facilities(id) ON DELETE SET NULL,
  production_date date NOT NULL DEFAULT CURRENT_DATE,
  quantity_produced numeric NOT NULL,
  unit_code text NOT NULL DEFAULT 'kg',
  expiry_date date,
  quality_status text NOT NULL DEFAULT 'accepted',
  storage_location text,
  status text NOT NULL DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.v2_production_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_batch_id uuid NOT NULL REFERENCES public.v2_production_batches(id) ON DELETE CASCADE,
  output_type public.v2_production_output_type NOT NULL,
  product_id uuid REFERENCES public.v2_processed_products(id) ON DELETE SET NULL,
  finished_batch_id uuid REFERENCES public.v2_finished_product_batches(id) ON DELETE SET NULL,
  label text,
  quantity numeric NOT NULL CHECK (quantity >= 0),
  unit_code text NOT NULL DEFAULT 'kg',
  loss_category public.v2_production_loss_category,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.v2_finished_goods_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES public.v2_processing_facilities(id) ON DELETE SET NULL,
  finished_batch_id uuid REFERENCES public.v2_finished_product_batches(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.v2_processed_products(id) ON DELETE SET NULL,
  movement_type public.v2_fg_movement_type NOT NULL,
  quantity numeric NOT NULL,
  unit_code text NOT NULL DEFAULT 'kg',
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ grants + RLS ============
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_production_recipes, public.v2_production_recipe_inputs,
  public.v2_production_recipe_outputs, public.v2_production_batches, public.v2_production_inputs,
  public.v2_production_outputs, public.v2_finished_product_batches, public.v2_finished_goods_movements TO authenticated;
GRANT ALL ON public.v2_production_recipes, public.v2_production_recipe_inputs,
  public.v2_production_recipe_outputs, public.v2_production_batches, public.v2_production_inputs,
  public.v2_production_outputs, public.v2_finished_product_batches, public.v2_finished_goods_movements TO service_role;

ALTER TABLE public.v2_production_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_production_recipe_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_production_recipe_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_production_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_production_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_finished_product_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_finished_goods_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recipes org access" ON public.v2_production_recipes FOR ALL TO authenticated
  USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()))
  WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()));
CREATE POLICY "recipe inputs org access" ON public.v2_production_recipe_inputs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.v2_production_recipes r WHERE r.id = recipe_id
    AND (public.v2_is_org_member(r.organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.v2_production_recipes r WHERE r.id = recipe_id AND public.v2_is_org_member(r.organization_id, auth.uid())));
CREATE POLICY "recipe outputs org access" ON public.v2_production_recipe_outputs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.v2_production_recipes r WHERE r.id = recipe_id
    AND (public.v2_is_org_member(r.organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.v2_production_recipes r WHERE r.id = recipe_id AND public.v2_is_org_member(r.organization_id, auth.uid())));

CREATE POLICY "production batches org access" ON public.v2_production_batches FOR ALL TO authenticated
  USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()))
  WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()));
CREATE POLICY "production inputs org access" ON public.v2_production_inputs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.v2_production_batches b WHERE b.id = production_batch_id
    AND (public.v2_is_org_member(b.organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.v2_production_batches b WHERE b.id = production_batch_id AND public.v2_is_org_member(b.organization_id, auth.uid())));
CREATE POLICY "production outputs org access" ON public.v2_production_outputs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.v2_production_batches b WHERE b.id = production_batch_id
    AND (public.v2_is_org_member(b.organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.v2_production_batches b WHERE b.id = production_batch_id AND public.v2_is_org_member(b.organization_id, auth.uid())));
CREATE POLICY "finished batches org access" ON public.v2_finished_product_batches FOR ALL TO authenticated
  USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()))
  WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()));
CREATE POLICY "finished goods movements org access" ON public.v2_finished_goods_movements FOR ALL TO authenticated
  USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()))
  WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()));

-- ============ indexes ============
CREATE INDEX IF NOT EXISTS v2_prod_batches_org_idx ON public.v2_production_batches (organization_id, production_date DESC);
CREATE INDEX IF NOT EXISTS v2_prod_batches_facility_idx ON public.v2_production_batches (facility_id);
CREATE INDEX IF NOT EXISTS v2_prod_batches_status_idx ON public.v2_production_batches (status);
CREATE INDEX IF NOT EXISTS v2_prod_inputs_batch_idx ON public.v2_production_inputs (production_batch_id);
CREATE INDEX IF NOT EXISTS v2_prod_inputs_rm_idx ON public.v2_production_inputs (raw_material_batch_id);
CREATE INDEX IF NOT EXISTS v2_prod_outputs_batch_idx ON public.v2_production_outputs (production_batch_id);
CREATE INDEX IF NOT EXISTS v2_fg_batches_org_idx ON public.v2_finished_product_batches (organization_id, production_date DESC);
CREATE INDEX IF NOT EXISTS v2_fg_batches_prod_idx ON public.v2_finished_product_batches (production_batch_id);
CREATE INDEX IF NOT EXISTS v2_fg_batches_product_idx ON public.v2_finished_product_batches (product_id);
CREATE INDEX IF NOT EXISTS v2_fg_moves_org_idx ON public.v2_finished_goods_movements (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS v2_fg_moves_batch_idx ON public.v2_finished_goods_movements (finished_batch_id);
CREATE INDEX IF NOT EXISTS v2_recipes_org_idx ON public.v2_production_recipes (organization_id);

CREATE TRIGGER v2_production_recipes_updated_at BEFORE UPDATE ON public.v2_production_recipes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER v2_production_batches_updated_at BEFORE UPDATE ON public.v2_production_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER v2_finished_product_batches_updated_at BEFORE UPDATE ON public.v2_finished_product_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- immutability guard: a completed batch cannot have quantity-impacting fields edited
CREATE OR REPLACE FUNCTION public.v2_guard_production_batch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.status = 'completed' AND NEW.status = 'completed' THEN
    IF NEW.total_input_tonnes IS DISTINCT FROM OLD.total_input_tonnes
       OR NEW.production_date IS DISTINCT FROM OLD.production_date
       OR NEW.product_id IS DISTINCT FROM OLD.product_id
       OR NEW.facility_id IS DISTINCT FROM OLD.facility_id THEN
      RAISE EXCEPTION 'PRODUCTION_BATCH_IMMUTABLE';
    END IF;
  END IF;
  IF OLD.status = 'voided' AND NEW.status <> 'voided' THEN
    RAISE EXCEPTION 'PRODUCTION_BATCH_VOIDED';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER v2_production_batches_guard BEFORE UPDATE ON public.v2_production_batches
  FOR EACH ROW EXECUTE FUNCTION public.v2_guard_production_batch();

CREATE OR REPLACE FUNCTION public.v2_guard_production_ledger()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'LEDGER_IMMUTABLE'; END $$;
CREATE TRIGGER v2_fg_movements_immutable BEFORE UPDATE OR DELETE ON public.v2_finished_goods_movements
  FOR EACH ROW EXECUTE FUNCTION public.v2_guard_production_ledger();

-- ============ atomic production posting ============
CREATE OR REPLACE FUNCTION public.v2_post_production(
  _organization_id uuid,
  _facility_id uuid,
  _product_id uuid,
  _inputs jsonb,
  _outputs jsonb,
  _recipe_id uuid DEFAULT NULL,
  _production_date date DEFAULT CURRENT_DATE,
  _notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _batch uuid; _ref text; _row jsonb; _rm public.v2_raw_material_batches%ROWTYPE;
  _qty numeric; _total numeric := 0; _fg uuid; _fg_ref text; _out_type public.v2_production_output_type;
  _inv_eligible boolean; _unit text; _prod uuid; _fg_list jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.v2_is_org_member(_organization_id, auth.uid()) THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;
  IF _inputs IS NULL OR jsonb_array_length(_inputs) = 0 THEN RAISE EXCEPTION 'NO_PRODUCTION_INPUTS'; END IF;
  IF _outputs IS NULL OR jsonb_array_length(_outputs) = 0 THEN RAISE EXCEPTION 'NO_PRODUCTION_OUTPUTS'; END IF;

  -- 1+2. lock every raw-material batch and validate stock BEFORE any write
  FOR _row IN SELECT * FROM jsonb_array_elements(_inputs) LOOP
    SELECT * INTO _rm FROM public.v2_raw_material_batches
      WHERE id = (_row->>'raw_material_batch_id')::uuid FOR UPDATE;
    IF _rm.id IS NULL THEN RAISE EXCEPTION 'RAW_BATCH_NOT_FOUND'; END IF;
    IF _rm.organization_id <> _organization_id THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;
    _qty := round((_row->>'quantity_tonnes')::numeric, 3);
    IF _qty IS NULL OR _qty <= 0 THEN RAISE EXCEPTION 'INVALID_INPUT_QUANTITY'; END IF;
    IF _qty > _rm.current_tonnes THEN
      RAISE EXCEPTION 'INSUFFICIENT_RAW_MATERIAL_STOCK:%:%:%', _rm.batch_reference, _rm.current_tonnes, _qty;
    END IF;
    _total := _total + _qty;
  END LOOP;

  _ref := public.v2_next_reference('PB');
  INSERT INTO public.v2_production_batches (batch_reference, organization_id, facility_id, recipe_id, product_id,
      production_date, started_at, completed_at, notes, responsible_user_id, status, total_input_tonnes, created_by)
  VALUES (_ref, _organization_id, _facility_id, _recipe_id, _product_id, _production_date, now(), now(),
      _notes, auth.uid(), 'completed', round(_total, 3), auth.uid())
  RETURNING id INTO _batch;

  -- 3+4. consumption movements + input records
  FOR _row IN SELECT * FROM jsonb_array_elements(_inputs) LOOP
    SELECT * INTO _rm FROM public.v2_raw_material_batches WHERE id = (_row->>'raw_material_batch_id')::uuid;
    _qty := round((_row->>'quantity_tonnes')::numeric, 3);
    UPDATE public.v2_raw_material_batches SET current_tonnes = round(current_tonnes - _qty, 3), updated_at = now()
      WHERE id = _rm.id;
    INSERT INTO public.v2_production_inputs (production_batch_id, raw_material_batch_id, crop_id, variety_id, quantity_tonnes, unit_code)
    VALUES (_batch, _rm.id, _rm.crop_id, _rm.variety_id, _qty, 't');
    INSERT INTO public.v2_inventory_movements (organization_id, facility_id, batch_id, crop_id, variety_id,
        movement_type, quantity_tonnes, reference_type, reference_id, notes, created_by)
    VALUES (_organization_id, COALESCE(_facility_id, _rm.facility_id), _rm.id, _rm.crop_id, _rm.variety_id,
        'production_consumption', -_qty, 'production_batch', _batch, _ref, auth.uid());
  END LOOP;

  -- 5-7. outputs, finished batches, finished-goods movements
  FOR _row IN SELECT * FROM jsonb_array_elements(_outputs) LOOP
    _out_type := (_row->>'output_type')::public.v2_production_output_type;
    _qty := round(COALESCE((_row->>'quantity')::numeric, 0), 3);
    IF _qty < 0 THEN RAISE EXCEPTION 'INVALID_OUTPUT_QUANTITY'; END IF;
    _unit := COALESCE(_row->>'unit_code', 'kg');
    _prod := NULLIF(_row->>'product_id', '')::uuid;
    _inv_eligible := _out_type IN ('finished_product','by_product') AND _prod IS NOT NULL AND _qty > 0;
    _fg := NULL;
    IF _inv_eligible THEN
      _fg_ref := public.v2_next_reference('FG');
      INSERT INTO public.v2_finished_product_batches (batch_reference, product_id, production_batch_id, organization_id,
          facility_id, production_date, quantity_produced, unit_code, expiry_date, quality_status, storage_location)
      VALUES (_fg_ref, _prod, _batch, _organization_id, _facility_id, _production_date, _qty, _unit,
          NULLIF(_row->>'expiry_date','')::date, COALESCE(_row->>'quality_status','accepted'), NULLIF(_row->>'storage_location',''))
      RETURNING id INTO _fg;
      INSERT INTO public.v2_finished_goods_movements (organization_id, facility_id, finished_batch_id, product_id,
          movement_type, quantity, unit_code, reference_type, reference_id, notes, created_by)
      VALUES (_organization_id, _facility_id, _fg, _prod, 'production_output', _qty, _unit, 'production_batch', _batch, _ref, auth.uid());
      _fg_list := _fg_list || jsonb_build_object('id', _fg, 'reference', _fg_ref, 'quantity', _qty, 'unit_code', _unit);
    END IF;
    INSERT INTO public.v2_production_outputs (production_batch_id, output_type, product_id, finished_batch_id,
        label, quantity, unit_code, loss_category, notes)
    VALUES (_batch, _out_type, _prod, _fg, NULLIF(_row->>'label',''), _qty, _unit,
        NULLIF(_row->>'loss_category','')::public.v2_production_loss_category, NULLIF(_row->>'notes',''));
  END LOOP;

  RETURN jsonb_build_object('production_batch_id', _batch, 'batch_reference', _ref,
    'total_input_tonnes', round(_total,3), 'finished_batches', _fg_list);
END $$;
REVOKE ALL ON FUNCTION public.v2_post_production(uuid,uuid,uuid,jsonb,jsonb,uuid,date,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v2_post_production(uuid,uuid,uuid,jsonb,jsonb,uuid,date,text) TO authenticated;

-- ============ controlled reversal ============
CREATE OR REPLACE FUNCTION public.v2_void_production(_production_batch_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _b public.v2_production_batches%ROWTYPE; _i record; _f record; _bal numeric;
BEGIN
  SELECT * INTO _b FROM public.v2_production_batches WHERE id = _production_batch_id FOR UPDATE;
  IF _b.id IS NULL THEN RAISE EXCEPTION 'PRODUCTION_BATCH_NOT_FOUND'; END IF;
  IF NOT public.v2_is_org_member(_b.organization_id, auth.uid()) THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;
  IF _b.status <> 'completed' THEN RAISE EXCEPTION 'PRODUCTION_BATCH_NOT_COMPLETED:%', _b.status; END IF;

  FOR _i IN SELECT * FROM public.v2_production_inputs WHERE production_batch_id = _b.id LOOP
    PERFORM 1 FROM public.v2_raw_material_batches WHERE id = _i.raw_material_batch_id FOR UPDATE;
    UPDATE public.v2_raw_material_batches SET current_tonnes = round(current_tonnes + _i.quantity_tonnes, 3), updated_at = now()
      WHERE id = _i.raw_material_batch_id;
    INSERT INTO public.v2_inventory_movements (organization_id, facility_id, batch_id, crop_id, variety_id,
        movement_type, quantity_tonnes, reference_type, reference_id, notes, created_by)
    VALUES (_b.organization_id, _b.facility_id, _i.raw_material_batch_id, _i.crop_id, _i.variety_id,
        'adjustment_in', _i.quantity_tonnes, 'production_void', _b.id, 'VOID ' || _b.batch_reference, auth.uid());
  END LOOP;

  FOR _f IN SELECT * FROM public.v2_finished_product_batches WHERE production_batch_id = _b.id LOOP
    SELECT COALESCE(sum(quantity), 0) INTO _bal FROM public.v2_finished_goods_movements WHERE finished_batch_id = _f.id;
    IF _bal <> 0 THEN
      INSERT INTO public.v2_finished_goods_movements (organization_id, facility_id, finished_batch_id, product_id,
          movement_type, quantity, unit_code, reference_type, reference_id, notes, created_by)
      VALUES (_b.organization_id, _b.facility_id, _f.id, _f.product_id, 'production_void', -_bal, _f.unit_code,
          'production_void', _b.id, 'VOID ' || _b.batch_reference, auth.uid());
    END IF;
    UPDATE public.v2_finished_product_batches SET status = 'voided', updated_at = now() WHERE id = _f.id;
  END LOOP;

  UPDATE public.v2_production_batches SET status = 'voided', void_reason = _reason, voided_at = now(), voided_by = auth.uid()
    WHERE id = _b.id;
  RETURN jsonb_build_object('production_batch_id', _b.id, 'status', 'voided');
END $$;
REVOKE ALL ON FUNCTION public.v2_void_production(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v2_void_production(uuid,text) TO authenticated;

-- ============ read models ============
CREATE OR REPLACE FUNCTION public.v2_finished_goods_stock(_organization_id uuid, _facility_id uuid DEFAULT NULL)
RETURNS TABLE (finished_batch_id uuid, batch_reference text, product_id uuid, product_name text, unit_code text,
  production_batch_id uuid, production_reference text, production_date date, quantity_produced numeric,
  quantity_available numeric, expiry_date date, quality_status text, storage_location text, facility_id uuid,
  facility_name text, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT f.id, f.batch_reference, f.product_id, p.product_name, f.unit_code,
         f.production_batch_id, b.batch_reference, f.production_date, f.quantity_produced,
         COALESCE((SELECT round(sum(m.quantity), 3) FROM public.v2_finished_goods_movements m WHERE m.finished_batch_id = f.id), 0),
         f.expiry_date, f.quality_status, f.storage_location, f.facility_id, fa.name, f.status
  FROM public.v2_finished_product_batches f
  LEFT JOIN public.v2_processed_products p ON p.id = f.product_id
  LEFT JOIN public.v2_production_batches b ON b.id = f.production_batch_id
  LEFT JOIN public.v2_processing_facilities fa ON fa.id = f.facility_id
  WHERE f.organization_id = _organization_id
    AND (_facility_id IS NULL OR f.facility_id = _facility_id)
    AND (public.v2_is_org_member(_organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()))
  ORDER BY f.production_date DESC, f.created_at DESC
$$;
REVOKE ALL ON FUNCTION public.v2_finished_goods_stock(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v2_finished_goods_stock(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.v2_production_summary(_organization_id uuid)
RETURNS TABLE (batches_this_month bigint, input_tonnes_this_month numeric, outputs_this_month jsonb,
  raw_inventory_tonnes numeric, finished_batches bigint, completed_batches bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT count(*) FROM public.v2_production_batches b WHERE b.organization_id = _organization_id
       AND b.status = 'completed' AND b.production_date >= date_trunc('month', CURRENT_DATE)),
    (SELECT round(COALESCE(sum(b.total_input_tonnes),0),3) FROM public.v2_production_batches b
       WHERE b.organization_id = _organization_id AND b.status = 'completed' AND b.production_date >= date_trunc('month', CURRENT_DATE)),
    (SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) FROM (
        SELECT o.unit_code, round(sum(o.quantity),3) AS quantity
        FROM public.v2_production_outputs o JOIN public.v2_production_batches b ON b.id = o.production_batch_id
        WHERE b.organization_id = _organization_id AND b.status = 'completed'
          AND b.production_date >= date_trunc('month', CURRENT_DATE) AND o.output_type = 'finished_product'
        GROUP BY o.unit_code) x),
    (SELECT round(COALESCE(sum(CASE WHEN m.movement_type = 'adjustment_out' THEN -m.quantity_tonnes ELSE m.quantity_tonnes END),0),3)
       FROM public.v2_inventory_movements m WHERE m.organization_id = _organization_id),
    (SELECT count(*) FROM public.v2_finished_product_batches f WHERE f.organization_id = _organization_id AND f.status = 'available'),
    (SELECT count(*) FROM public.v2_production_batches b WHERE b.organization_id = _organization_id AND b.status = 'completed')
  WHERE public.v2_is_org_member(_organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid())
$$;
REVOKE ALL ON FUNCTION public.v2_production_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v2_production_summary(uuid) TO authenticated;

-- backward traceability: finished lot -> production -> raw lots -> receipts -> orders -> suppliers -> farms
CREATE OR REPLACE FUNCTION public.v2_trace_finished_batch(_finished_batch_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _f public.v2_finished_product_batches%ROWTYPE; _org uuid; _admin boolean; _res jsonb;
BEGIN
  SELECT * INTO _f FROM public.v2_finished_product_batches WHERE id = _finished_batch_id;
  IF _f.id IS NULL THEN RAISE EXCEPTION 'FINISHED_BATCH_NOT_FOUND'; END IF;
  _org := _f.organization_id;
  _admin := public.v2_is_agrigrid_admin(auth.uid());
  IF NOT (public.v2_is_org_member(_org, auth.uid()) OR _admin) THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;

  SELECT jsonb_build_object(
    'finished_batch', jsonb_build_object('id', _f.id, 'reference', _f.batch_reference, 'product',
        (SELECT p.product_name FROM public.v2_processed_products p WHERE p.id = _f.product_id),
        'quantity', _f.quantity_produced, 'unit_code', _f.unit_code, 'production_date', _f.production_date,
        'expiry_date', _f.expiry_date, 'status', _f.status),
    'production_batch', (SELECT jsonb_build_object('id', b.id, 'reference', b.batch_reference, 'status', b.status,
        'production_date', b.production_date, 'total_input_tonnes', b.total_input_tonnes, 'notes', b.notes)
        FROM public.v2_production_batches b WHERE b.id = _f.production_batch_id),
    'inputs', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'raw_batch_id', rm.id, 'raw_batch_reference', rm.batch_reference, 'quantity_tonnes', pi.quantity_tonnes,
        'receipt_date', rm.receipt_date, 'quality_status', rm.quality_status,
        'crop', c.name_fr, 'variety', v.name_fr,
        'receipt_reference', gr.reference, 'delivery_reference', d.reference, 'order_number', o.order_number,
        'supplier', jsonb_build_object(
          'id', CASE WHEN _admin OR released.ok THEN s.id::text ELSE NULL END,
          'code', s.supplier_code,
          'type', s.supplier_type,
          'commune', CASE WHEN _admin OR released.ok THEN s.commune ELSE NULL END,
          'department', s.department,
          'display_name', CASE WHEN _admin OR released.ok THEN s.display_name ELSE NULL END,
          'contact_released', COALESCE(released.ok, false)),
        'farm', CASE WHEN _admin OR released.ok THEN (SELECT fm.name FROM public.v2_farms fm WHERE fm.id = rm.farm_id) ELSE NULL END,
        'crop_cycle_id', rm.crop_cycle_id))
      FROM public.v2_production_inputs pi
      JOIN public.v2_raw_material_batches rm ON rm.id = pi.raw_material_batch_id
      LEFT JOIN public.v2_crops c ON c.id = rm.crop_id
      LEFT JOIN public.v2_crop_varieties v ON v.id = rm.variety_id
      LEFT JOIN public.v2_goods_receipts gr ON gr.id = rm.receipt_id
      LEFT JOIN public.v2_deliveries d ON d.id = rm.delivery_id
      LEFT JOIN public.v2_procurement_orders o ON o.id = rm.order_id
      LEFT JOIN public.v2_suppliers s ON s.id = rm.supplier_id
      LEFT JOIN LATERAL (SELECT true AS ok WHERE EXISTS (
          SELECT 1 FROM public.v2_supply_commitments sc WHERE sc.supplier_id = rm.supplier_id
            AND sc.organization_id = _org AND sc.contact_released
        )) released ON true
      WHERE pi.production_batch_id = _f.production_batch_id), '[]'::jsonb)
  ) INTO _res;
  RETURN _res;
END $$;
REVOKE ALL ON FUNCTION public.v2_trace_finished_batch(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v2_trace_finished_batch(uuid) TO authenticated;

-- forward traceability: raw lot -> production batches -> finished lots
CREATE OR REPLACE FUNCTION public.v2_trace_raw_batch(_raw_batch_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _rm public.v2_raw_material_batches%ROWTYPE;
BEGIN
  SELECT * INTO _rm FROM public.v2_raw_material_batches WHERE id = _raw_batch_id;
  IF _rm.id IS NULL THEN RAISE EXCEPTION 'RAW_BATCH_NOT_FOUND'; END IF;
  IF NOT (public.v2_is_org_member(_rm.organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()))
    THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;

  RETURN jsonb_build_object(
    'raw_batch', jsonb_build_object('id', _rm.id, 'reference', _rm.batch_reference,
      'received_tonnes', _rm.received_tonnes, 'current_tonnes', _rm.current_tonnes,
      'consumed_tonnes', COALESCE((SELECT round(sum(pi.quantity_tonnes),3) FROM public.v2_production_inputs pi
         JOIN public.v2_production_batches b ON b.id = pi.production_batch_id
         WHERE pi.raw_material_batch_id = _rm.id AND b.status = 'completed'), 0),
      'receipt_date', _rm.receipt_date),
    'productions', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'production_batch_id', b.id, 'reference', b.batch_reference, 'status', b.status,
        'production_date', b.production_date, 'quantity_tonnes', pi.quantity_tonnes,
        'finished_batches', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', f.id, 'reference', f.batch_reference,
            'quantity', f.quantity_produced, 'unit_code', f.unit_code, 'status', f.status))
          FROM public.v2_finished_product_batches f WHERE f.production_batch_id = b.id), '[]'::jsonb)))
      FROM public.v2_production_inputs pi JOIN public.v2_production_batches b ON b.id = pi.production_batch_id
      WHERE pi.raw_material_batch_id = _rm.id), '[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.v2_trace_raw_batch(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.v2_trace_raw_batch(uuid) TO authenticated;