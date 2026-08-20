-- ============================================================================
-- AGRI-GRID V2 — PHASE 1E: commercial confirmation, procurement, delivery,
-- goods receipt, raw-material batches and the inventory ledger.
-- Everything is additive and v2-only; V1 objects are untouched.
-- ============================================================================

CREATE TYPE public.v2_commitment_status AS ENUM (
  'proposed','pending_confirmation','confirmed','partially_confirmed',
  'declined','released','expired','cancelled','fulfilled'
);
CREATE TYPE public.v2_confirmation_method AS ENUM (
  'supplier_self_service','field_agent','agrigrid_admin'
);
CREATE TYPE public.v2_procurement_status AS ENUM (
  'draft','pending_supplier_confirmation','confirmed','ready_for_delivery',
  'partially_delivered','delivered','cancelled','expired'
);
CREATE TYPE public.v2_payment_status AS ENUM ('not_recorded','unpaid','partially_paid','paid');
CREATE TYPE public.v2_delivery_status AS ENUM (
  'scheduled','in_transit','arrived','received','partially_accepted','rejected','cancelled'
);
CREATE TYPE public.v2_receipt_quality AS ENUM (
  'accepted','accepted_with_reservation','partially_accepted','rejected'
);
CREATE TYPE public.v2_inventory_movement_type AS ENUM (
  'receipt','adjustment_in','adjustment_out'
);

-- ------------------------------------------------------------------ settings
INSERT INTO public.v2_settings (key, value, description) VALUES
  ('commercial_commitment', jsonb_build_object(
      'confirmation_ttl_days', 5,      -- proposal → must be answered within
      'order_creation_days', 7,        -- confirmed → must become an order within
      'over_delivery_tolerance_pct', 0 -- above ordered qty requires explicit acceptance
   ), 'Phase 1E commercial commitment lifecycle configuration')
ON CONFLICT (key) DO NOTHING;

-- =============================== COMMITMENTS ================================
CREATE TABLE public.v2_supply_commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES public.v2_processing_facilities(id) ON DELETE SET NULL,
  sourcing_request_id uuid REFERENCES public.v2_sourcing_requests(id) ON DELETE SET NULL,
  supply_id uuid NOT NULL REFERENCES public.v2_supply_availability(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.v2_suppliers(id) ON DELETE CASCADE,
  crop_id uuid REFERENCES public.v2_crops(id),
  variety_id uuid REFERENCES public.v2_crop_varieties(id),
  proposed_quantity numeric NOT NULL CHECK (proposed_quantity > 0),
  proposed_tonnes numeric NOT NULL DEFAULT 0,
  confirmed_quantity numeric CHECK (confirmed_quantity IS NULL OR confirmed_quantity >= 0),
  confirmed_tonnes numeric NOT NULL DEFAULT 0,
  unit_code text NOT NULL DEFAULT 't',
  requested_start date,
  requested_end date,
  confirmed_start date,
  confirmed_end date,
  agreed_unit_price numeric,
  price_unit text,
  currency text NOT NULL DEFAULT 'XOF',
  status public.v2_commitment_status NOT NULL DEFAULT 'proposed',
  confirmation_method public.v2_confirmation_method,
  confirmed_by_user uuid,
  confirmed_at timestamptz,
  expires_at timestamptz,
  decline_reason text,
  cancellation_reason text,
  closed_at timestamptz,
  contact_released boolean NOT NULL DEFAULT false,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_v2_commitments_supply ON public.v2_supply_commitments(supply_id, status);
CREATE INDEX idx_v2_commitments_request ON public.v2_supply_commitments(sourcing_request_id);
CREATE INDEX idx_v2_commitments_org ON public.v2_supply_commitments(organization_id, status);
CREATE INDEX idx_v2_commitments_supplier ON public.v2_supply_commitments(supplier_id, status);

GRANT SELECT ON public.v2_supply_commitments TO authenticated;
GRANT ALL ON public.v2_supply_commitments TO service_role;
ALTER TABLE public.v2_supply_commitments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commitments readable by the parties involved"
ON public.v2_supply_commitments FOR SELECT TO authenticated
USING (
  public.v2_is_org_member(organization_id, auth.uid())
  OR public.v2_is_agrigrid_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.v2_suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.v2_supplier_assignments a
    JOIN public.v2_field_agents fa ON fa.id = a.field_agent_id AND fa.status = 'active'
    WHERE a.supplier_id = v2_supply_commitments.supplier_id AND fa.user_id = auth.uid()
  )
);
-- writes go exclusively through the SECURITY DEFINER RPCs below (atomicity + auth)

CREATE TRIGGER update_v2_supply_commitments_updated_at
BEFORE UPDATE ON public.v2_supply_commitments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- commercial-confirmation tasks reuse the field-agent task feed
ALTER TABLE public.v2_reconfirmation_tasks
  ADD COLUMN task_kind text NOT NULL DEFAULT 'data_reconfirmation',
  ADD COLUMN commitment_id uuid REFERENCES public.v2_supply_commitments(id) ON DELETE CASCADE;

-- ============================ PROCUREMENT ORDERS ============================
CREATE SEQUENCE public.v2_procurement_order_seq;

CREATE TABLE public.v2_procurement_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES public.v2_processing_facilities(id) ON DELETE SET NULL,
  supplier_id uuid NOT NULL REFERENCES public.v2_suppliers(id),
  sourcing_request_id uuid REFERENCES public.v2_sourcing_requests(id) ON DELETE SET NULL,
  commitment_id uuid REFERENCES public.v2_supply_commitments(id) ON DELETE SET NULL,
  expected_delivery_start date,
  expected_delivery_end date,
  delivery_location text,
  quality_requirement text,
  packaging_requirement text,
  currency text NOT NULL DEFAULT 'XOF',
  total_expected_amount numeric,
  commercial_notes text,
  status public.v2_procurement_status NOT NULL DEFAULT 'draft',
  payment_status public.v2_payment_status NOT NULL DEFAULT 'not_recorded',
  cancellation_reason text,
  cancelled_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_v2_po_org ON public.v2_procurement_orders(organization_id, status);
CREATE INDEX idx_v2_po_supplier ON public.v2_procurement_orders(supplier_id);

CREATE TABLE public.v2_procurement_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.v2_procurement_orders(id) ON DELETE CASCADE,
  supply_id uuid REFERENCES public.v2_supply_availability(id) ON DELETE SET NULL,
  commitment_id uuid REFERENCES public.v2_supply_commitments(id) ON DELETE SET NULL,
  crop_id uuid REFERENCES public.v2_crops(id),
  variety_id uuid REFERENCES public.v2_crop_varieties(id),
  ordered_quantity numeric NOT NULL CHECK (ordered_quantity > 0),
  ordered_tonnes numeric NOT NULL DEFAULT 0,
  unit_code text NOT NULL DEFAULT 't',
  agreed_unit_price numeric,
  price_unit text,
  line_amount numeric,
  received_tonnes numeric NOT NULL DEFAULT 0,
  accepted_tonnes numeric NOT NULL DEFAULT 0,
  rejected_tonnes numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_v2_po_lines_order ON public.v2_procurement_order_lines(order_id);

GRANT SELECT, INSERT, UPDATE ON public.v2_procurement_orders TO authenticated;
GRANT ALL ON public.v2_procurement_orders TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.v2_procurement_order_lines TO authenticated;
GRANT ALL ON public.v2_procurement_order_lines TO service_role;
ALTER TABLE public.v2_procurement_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_procurement_order_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders readable by the parties involved"
ON public.v2_procurement_orders FOR SELECT TO authenticated
USING (
  public.v2_is_org_member(organization_id, auth.uid())
  OR public.v2_is_agrigrid_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.v2_suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.v2_supplier_assignments a
    JOIN public.v2_field_agents fa ON fa.id = a.field_agent_id AND fa.status = 'active'
    WHERE a.supplier_id = v2_procurement_orders.supplier_id AND fa.user_id = auth.uid()
  )
);
CREATE POLICY "org members manage their orders"
ON public.v2_procurement_orders FOR UPDATE TO authenticated
USING (public.v2_is_org_member(organization_id, auth.uid()))
WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()));
CREATE POLICY "org members create their orders"
ON public.v2_procurement_orders FOR INSERT TO authenticated
WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "order lines follow the order"
ON public.v2_procurement_order_lines FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.v2_procurement_orders o WHERE o.id = order_id));
CREATE POLICY "org members write order lines"
ON public.v2_procurement_order_lines FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.v2_procurement_orders o
  WHERE o.id = order_id AND public.v2_is_org_member(o.organization_id, auth.uid())
));
CREATE POLICY "org members update order lines"
ON public.v2_procurement_order_lines FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.v2_procurement_orders o
  WHERE o.id = order_id AND public.v2_is_org_member(o.organization_id, auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.v2_procurement_orders o
  WHERE o.id = order_id AND public.v2_is_org_member(o.organization_id, auth.uid())
));

CREATE TRIGGER update_v2_procurement_orders_updated_at BEFORE UPDATE ON public.v2_procurement_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_v2_procurement_order_lines_updated_at BEFORE UPDATE ON public.v2_procurement_order_lines
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================================ DELIVERIES ================================
CREATE TABLE public.v2_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL,
  order_id uuid NOT NULL REFERENCES public.v2_procurement_orders(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES public.v2_processing_facilities(id) ON DELETE SET NULL,
  supplier_id uuid NOT NULL REFERENCES public.v2_suppliers(id),
  scheduled_date date,
  actual_arrival_date date,
  declared_quantity numeric,
  received_quantity numeric,
  unit_code text NOT NULL DEFAULT 't',
  status public.v2_delivery_status NOT NULL DEFAULT 'scheduled',
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_v2_deliveries_order ON public.v2_deliveries(order_id);
CREATE INDEX idx_v2_deliveries_org ON public.v2_deliveries(organization_id, status);

GRANT SELECT, INSERT, UPDATE ON public.v2_deliveries TO authenticated;
GRANT ALL ON public.v2_deliveries TO service_role;
ALTER TABLE public.v2_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deliveries readable by the parties involved"
ON public.v2_deliveries FOR SELECT TO authenticated
USING (
  public.v2_is_org_member(organization_id, auth.uid())
  OR public.v2_is_agrigrid_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.v2_suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid())
);
CREATE POLICY "org members create deliveries"
ON public.v2_deliveries FOR INSERT TO authenticated
WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY "org members update deliveries"
ON public.v2_deliveries FOR UPDATE TO authenticated
USING (public.v2_is_org_member(organization_id, auth.uid()))
WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()));

CREATE TRIGGER update_v2_deliveries_updated_at BEFORE UPDATE ON public.v2_deliveries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================== GOODS RECEIPTS ==============================
CREATE TABLE public.v2_goods_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL,
  delivery_id uuid NOT NULL REFERENCES public.v2_deliveries(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.v2_procurement_orders(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES public.v2_processing_facilities(id) ON DELETE SET NULL,
  supplier_id uuid NOT NULL REFERENCES public.v2_suppliers(id),
  delivered_quantity numeric NOT NULL DEFAULT 0,
  accepted_quantity numeric NOT NULL DEFAULT 0,
  rejected_quantity numeric NOT NULL DEFAULT 0,
  unit_code text NOT NULL DEFAULT 't',
  delivered_tonnes numeric NOT NULL DEFAULT 0,
  accepted_tonnes numeric NOT NULL DEFAULT 0,
  rejected_tonnes numeric NOT NULL DEFAULT 0,
  quality_result public.v2_receipt_quality NOT NULL DEFAULT 'accepted',
  quality_grade text,
  condition_notes text,
  receiving_notes text,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  over_delivery_tonnes numeric NOT NULL DEFAULT 0,
  over_delivery_accepted boolean NOT NULL DEFAULT false,
  received_by uuid NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_v2_receipts_order ON public.v2_goods_receipts(order_id);
CREATE INDEX idx_v2_receipts_org ON public.v2_goods_receipts(organization_id, received_at DESC);

GRANT SELECT ON public.v2_goods_receipts TO authenticated;
GRANT ALL ON public.v2_goods_receipts TO service_role;
ALTER TABLE public.v2_goods_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "receipts readable by the processor and admins"
ON public.v2_goods_receipts FOR SELECT TO authenticated
USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()));
-- receipts are only ever posted through v2_receive_goods (atomic inventory posting)

-- =========================== RAW MATERIAL BATCHES ===========================
CREATE TABLE public.v2_raw_material_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_reference text NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES public.v2_processing_facilities(id) ON DELETE SET NULL,
  crop_id uuid REFERENCES public.v2_crops(id),
  variety_id uuid REFERENCES public.v2_crop_varieties(id),
  supplier_id uuid REFERENCES public.v2_suppliers(id),
  farm_id uuid REFERENCES public.v2_farms(id),
  crop_cycle_id uuid REFERENCES public.v2_crop_cycles(id),
  supply_id uuid REFERENCES public.v2_supply_availability(id),
  order_id uuid REFERENCES public.v2_procurement_orders(id) ON DELETE SET NULL,
  delivery_id uuid REFERENCES public.v2_deliveries(id) ON DELETE SET NULL,
  receipt_id uuid REFERENCES public.v2_goods_receipts(id) ON DELETE SET NULL,
  received_tonnes numeric NOT NULL DEFAULT 0,
  current_tonnes numeric NOT NULL DEFAULT 0,
  unit_code text NOT NULL DEFAULT 't',
  receipt_date date NOT NULL DEFAULT current_date,
  quality_status public.v2_receipt_quality NOT NULL DEFAULT 'accepted',
  quality_grade text,
  storage_location text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_v2_batches_org ON public.v2_raw_material_batches(organization_id, receipt_date DESC);

GRANT SELECT, UPDATE ON public.v2_raw_material_batches TO authenticated;
GRANT ALL ON public.v2_raw_material_batches TO service_role;
ALTER TABLE public.v2_raw_material_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "batches readable by the processor and admins"
ON public.v2_raw_material_batches FOR SELECT TO authenticated
USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()));
CREATE POLICY "org members update their batches"
ON public.v2_raw_material_batches FOR UPDATE TO authenticated
USING (public.v2_is_org_member(organization_id, auth.uid()))
WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()));

CREATE TRIGGER update_v2_raw_material_batches_updated_at BEFORE UPDATE ON public.v2_raw_material_batches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================ INVENTORY LEDGER ==============================
CREATE TABLE public.v2_inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES public.v2_processing_facilities(id) ON DELETE SET NULL,
  batch_id uuid REFERENCES public.v2_raw_material_batches(id) ON DELETE SET NULL,
  crop_id uuid REFERENCES public.v2_crops(id),
  variety_id uuid REFERENCES public.v2_crop_varieties(id),
  movement_type public.v2_inventory_movement_type NOT NULL,
  quantity_tonnes numeric NOT NULL,
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_v2_inventory_org ON public.v2_inventory_movements(organization_id, created_at DESC);
CREATE INDEX idx_v2_inventory_crop ON public.v2_inventory_movements(organization_id, crop_id, variety_id);

GRANT SELECT, INSERT ON public.v2_inventory_movements TO authenticated;
GRANT ALL ON public.v2_inventory_movements TO service_role;
ALTER TABLE public.v2_inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory readable by the processor and admins"
ON public.v2_inventory_movements FOR SELECT TO authenticated
USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()));
CREATE POLICY "org members record manual adjustments"
ON public.v2_inventory_movements FOR INSERT TO authenticated
WITH CHECK (
  public.v2_is_org_member(organization_id, auth.uid())
  AND created_by = auth.uid()
  AND movement_type IN ('adjustment_in','adjustment_out')
);

-- ============================== NOTIFICATIONS ===============================
CREATE TABLE public.v2_notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  recipient_user_id uuid,
  supplier_id uuid REFERENCES public.v2_suppliers(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  channel text NOT NULL DEFAULT 'in_app',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_v2_notifications_org ON public.v2_notification_events(organization_id, created_at DESC);

GRANT SELECT, UPDATE ON public.v2_notification_events TO authenticated;
GRANT ALL ON public.v2_notification_events TO service_role;
ALTER TABLE public.v2_notification_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications readable by recipients"
ON public.v2_notification_events FOR SELECT TO authenticated
USING (
  recipient_user_id = auth.uid()
  OR (organization_id IS NOT NULL AND public.v2_is_org_member(organization_id, auth.uid()))
  OR public.v2_is_agrigrid_admin(auth.uid())
);
CREATE POLICY "recipients mark notifications read"
ON public.v2_notification_events FOR UPDATE TO authenticated
USING (recipient_user_id = auth.uid() OR (organization_id IS NOT NULL AND public.v2_is_org_member(organization_id, auth.uid())))
WITH CHECK (recipient_user_id = auth.uid() OR (organization_id IS NOT NULL AND public.v2_is_org_member(organization_id, auth.uid())));

-- ======================= COMMERCIAL AVAILABILITY MATH =======================
-- RESERVATION RULE (documented, single source of truth):
--   committed = Σ confirmed_tonnes of commitments in
--               ('confirmed','partially_confirmed','fulfilled')
--   Only those statuses reduce commercial availability. proposed /
--   pending_confirmation / declined / released / expired / cancelled do not.
--   Physical field observations (v2_supply_availability.quantity_available) are
--   NEVER modified by the commercial layer.
CREATE OR REPLACE FUNCTION public.v2_committed_tonnes(_supply_id uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(sum(c.confirmed_tonnes), 0)
  FROM public.v2_supply_commitments c
  WHERE c.supply_id = _supply_id
    AND c.status IN ('confirmed','partially_confirmed','fulfilled')
$$;

CREATE OR REPLACE FUNCTION public.v2_supply_remaining_tonnes(_supply_id uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT GREATEST(0, round(
    COALESCE(public.v2_to_tonnes(sa.quantity_available, sa.unit_code), 0)
    - public.v2_committed_tonnes(sa.id), 3))
  FROM public.v2_supply_availability sa WHERE sa.id = _supply_id
$$;

-- ============================ COMMITMENT RPCS ===============================
-- 1. PROPOSE — processor picks a supplier and an explicit quantity.
CREATE OR REPLACE FUNCTION public.v2_propose_commitment(
  _request_id uuid,
  _supply_id uuid,
  _quantity numeric,
  _unit_code text DEFAULT 't',
  _start date DEFAULT NULL,
  _end date DEFAULT NULL,
  _target_price numeric DEFAULT NULL,
  _notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _req public.v2_sourcing_requests%ROWTYPE;
  _sa  public.v2_supply_availability%ROWTYPE;
  _cfg jsonb;
  _ttl int;
  _tonnes numeric;
  _remaining numeric;
  _agent uuid;
  _supplier_user uuid;
  _id uuid;
BEGIN
  SELECT * INTO _req FROM public.v2_sourcing_requests WHERE id = _request_id;
  IF _req.id IS NULL THEN RAISE EXCEPTION 'SOURCING_REQUEST_NOT_FOUND'; END IF;
  IF NOT (public.v2_is_org_member(_req.organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid())) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  SELECT * INTO _sa FROM public.v2_supply_availability WHERE id = _supply_id;
  IF _sa.id IS NULL THEN RAISE EXCEPTION 'SUPPLY_NOT_FOUND'; END IF;

  _tonnes := COALESCE(public.v2_to_tonnes(_quantity, COALESCE(_unit_code, 't')), _quantity);
  _remaining := public.v2_supply_remaining_tonnes(_supply_id);
  IF _remaining <= 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_AVAILABILITY:0' USING HINT = 'No uncommitted quantity remains on this supply record';
  END IF;

  SELECT value INTO _cfg FROM public.v2_settings WHERE key = 'commercial_commitment';
  _ttl := COALESCE((_cfg->>'confirmation_ttl_days')::int, 5);

  SELECT user_id INTO _supplier_user FROM public.v2_suppliers WHERE id = _sa.supplier_id;

  INSERT INTO public.v2_supply_commitments (
    organization_id, facility_id, sourcing_request_id, supply_id, supplier_id,
    crop_id, variety_id, proposed_quantity, proposed_tonnes, unit_code,
    requested_start, requested_end, agreed_unit_price, price_unit,
    status, expires_at, notes, created_by
  ) VALUES (
    _req.organization_id, _req.facility_id, _request_id, _supply_id, _sa.supplier_id,
    _sa.crop_id, _sa.variety_id, _quantity, _tonnes, COALESCE(_unit_code, 't'),
    COALESCE(_start, _req.availability_start), COALESCE(_end, _req.availability_end),
    COALESCE(_target_price, _req.target_price), _req.price_unit,
    'pending_confirmation', now() + (_ttl || ' days')::interval, _notes, auth.uid()
  ) RETURNING id INTO _id;

  -- field-agent commercial confirmation task (path B: supplier without digital access)
  SELECT a.field_agent_id INTO _agent
  FROM public.v2_supplier_assignments a
  JOIN public.v2_field_agents fa ON fa.id = a.field_agent_id AND fa.status = 'active'
  WHERE a.supplier_id = _sa.supplier_id
  ORDER BY a.is_primary DESC, a.created_at LIMIT 1;

  INSERT INTO public.v2_reconfirmation_tasks (
    sourcing_request_id, supplier_id, supply_id, crop_cycle_id, crop_id, field_agent_id,
    reason, priority, needed_by, due_date, status, created_by, task_kind, commitment_id
  ) VALUES (
    _request_id, _sa.supplier_id, _supply_id, _sa.crop_cycle_id, _sa.crop_id, _agent,
    'commercial_confirmation', 'urgent', _req.availability_start,
    LEAST(_req.availability_start, current_date + _ttl),
    (CASE WHEN _agent IS NULL THEN 'open' ELSE 'assigned' END)::public.v2_reconfirmation_status,
    auth.uid(), 'commercial_confirmation', _id
  );

  INSERT INTO public.v2_notification_events (organization_id, recipient_user_id, supplier_id, event_type, payload)
  VALUES (_req.organization_id, _supplier_user, _sa.supplier_id, 'SUPPLIER_CONFIRMATION_REQUESTED',
          jsonb_build_object('commitment_id', _id, 'sourcing_request_id', _request_id, 'tonnes', _tonnes));

  INSERT INTO public.v2_sourcing_events (sourcing_request_id, event_type, payload, actor_id)
  VALUES (_request_id, 'commitment_proposed',
          jsonb_build_object('commitment_id', _id, 'supply_id', _supply_id, 'tonnes', _tonnes), auth.uid());

  RETURN _id;
END;
$$;

-- 2. CONFIRM — ATOMIC reservation. Locks the supply row so two processors can
--    never over-commit the same tonnes.
CREATE OR REPLACE FUNCTION public.v2_confirm_commitment(
  _commitment_id uuid,
  _accepted boolean,
  _confirmed_quantity numeric DEFAULT NULL,
  _unit_code text DEFAULT NULL,
  _start date DEFAULT NULL,
  _end date DEFAULT NULL,
  _unit_price numeric DEFAULT NULL,
  _notes text DEFAULT NULL
) RETURNS public.v2_supply_commitments LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _c public.v2_supply_commitments%ROWTYPE;
  _method public.v2_confirmation_method;
  _tonnes numeric;
  _physical numeric;
  _committed numeric;
  _remaining numeric;
  _cfg jsonb;
  _order_days int;
BEGIN
  SELECT * INTO _c FROM public.v2_supply_commitments WHERE id = _commitment_id;
  IF _c.id IS NULL THEN RAISE EXCEPTION 'COMMITMENT_NOT_FOUND'; END IF;
  IF _c.status NOT IN ('proposed','pending_confirmation') THEN
    RAISE EXCEPTION 'COMMITMENT_NOT_PENDING:%', _c.status;
  END IF;

  -- who is answering? this also fixes the confirmation_method honestly
  IF EXISTS (SELECT 1 FROM public.v2_suppliers s WHERE s.id = _c.supplier_id AND s.user_id = auth.uid()) THEN
    _method := 'supplier_self_service';
  ELSIF EXISTS (
    SELECT 1 FROM public.v2_supplier_assignments a
    JOIN public.v2_field_agents fa ON fa.id = a.field_agent_id AND fa.status = 'active'
    WHERE a.supplier_id = _c.supplier_id AND fa.user_id = auth.uid()
  ) OR public.v2_is_field_agent(auth.uid()) THEN
    _method := 'field_agent';
  ELSIF public.v2_is_agrigrid_admin(auth.uid()) THEN
    _method := 'agrigrid_admin';
  ELSE
    RAISE EXCEPTION 'NOT_AUTHORIZED_TO_CONFIRM';
  END IF;

  IF NOT _accepted THEN
    UPDATE public.v2_supply_commitments
       SET status = 'declined', confirmation_method = _method, confirmed_by_user = auth.uid(),
           confirmed_at = now(), confirmed_quantity = 0, confirmed_tonnes = 0,
           decline_reason = _notes, closed_at = now()
     WHERE id = _commitment_id RETURNING * INTO _c;

    UPDATE public.v2_reconfirmation_tasks
       SET status = 'not_available', observation = _notes, completed_at = now()
     WHERE commitment_id = _commitment_id AND status IN ('open','assigned','in_progress');

    INSERT INTO public.v2_notification_events (organization_id, supplier_id, event_type, payload)
    VALUES (_c.organization_id, _c.supplier_id, 'SUPPLIER_DECLINED',
            jsonb_build_object('commitment_id', _c.id));
    IF _c.sourcing_request_id IS NOT NULL THEN
      INSERT INTO public.v2_sourcing_events (sourcing_request_id, event_type, payload, actor_id)
      VALUES (_c.sourcing_request_id, 'commitment_declined', jsonb_build_object('commitment_id', _c.id), auth.uid());
    END IF;
    RETURN _c;
  END IF;

  -- ---- atomic availability check -----------------------------------------
  PERFORM 1 FROM public.v2_supply_availability WHERE id = _c.supply_id FOR UPDATE;

  _tonnes := COALESCE(
    public.v2_to_tonnes(COALESCE(_confirmed_quantity, _c.proposed_quantity), COALESCE(_unit_code, _c.unit_code)),
    COALESCE(_confirmed_quantity, _c.proposed_quantity));

  SELECT COALESCE(public.v2_to_tonnes(sa.quantity_available, sa.unit_code), 0)
    INTO _physical FROM public.v2_supply_availability sa WHERE sa.id = _c.supply_id;

  SELECT COALESCE(sum(confirmed_tonnes), 0) INTO _committed
  FROM public.v2_supply_commitments
  WHERE supply_id = _c.supply_id AND id <> _c.id
    AND status IN ('confirmed','partially_confirmed','fulfilled');

  _remaining := round(_physical - _committed, 3);

  IF _tonnes > _remaining THEN
    RAISE EXCEPTION 'INSUFFICIENT_AVAILABILITY:%', _remaining
      USING HINT = 'Only ' || _remaining || ' t remain commercially available on this supply record';
  END IF;

  SELECT value INTO _cfg FROM public.v2_settings WHERE key = 'commercial_commitment';
  _order_days := COALESCE((_cfg->>'order_creation_days')::int, 7);

  UPDATE public.v2_supply_commitments
     SET status = (CASE WHEN _tonnes < proposed_tonnes THEN 'partially_confirmed' ELSE 'confirmed' END)::public.v2_commitment_status,
         confirmed_quantity = COALESCE(_confirmed_quantity, proposed_quantity),
         confirmed_tonnes = _tonnes,
         unit_code = COALESCE(_unit_code, unit_code),
         confirmed_start = COALESCE(_start, requested_start),
         confirmed_end = COALESCE(_end, requested_end),
         agreed_unit_price = COALESCE(_unit_price, agreed_unit_price),
         confirmation_method = _method,
         confirmed_by_user = auth.uid(),
         confirmed_at = now(),
         expires_at = now() + (_order_days || ' days')::interval,
         contact_released = true,
         notes = COALESCE(_notes, notes)
   WHERE id = _commitment_id
   RETURNING * INTO _c;

  UPDATE public.v2_reconfirmation_tasks
     SET status = 'confirmed', result_quantity = _c.confirmed_quantity, result_unit_code = _c.unit_code,
         result_available_start = _c.confirmed_start, result_available_end = _c.confirmed_end,
         result_asking_price = _c.agreed_unit_price, observation = _notes, completed_at = now()
   WHERE commitment_id = _commitment_id AND status IN ('open','assigned','in_progress');

  INSERT INTO public.v2_notification_events (organization_id, supplier_id, event_type, payload)
  VALUES (_c.organization_id, _c.supplier_id, 'SUPPLIER_CONFIRMED',
          jsonb_build_object('commitment_id', _c.id, 'tonnes', _tonnes, 'method', _method));

  IF _c.sourcing_request_id IS NOT NULL THEN
    INSERT INTO public.v2_sourcing_events (sourcing_request_id, event_type, payload, actor_id)
    VALUES (_c.sourcing_request_id, 'commitment_confirmed',
            jsonb_build_object('commitment_id', _c.id, 'tonnes', _tonnes, 'method', _method), auth.uid());
  END IF;

  RETURN _c;
END;
$$;

-- 3. RELEASE / CANCEL — frees the reserved quantity, never deletes history.
CREATE OR REPLACE FUNCTION public.v2_release_commitment(
  _commitment_id uuid, _reason text DEFAULT NULL, _cancel boolean DEFAULT false
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _c public.v2_supply_commitments%ROWTYPE;
BEGIN
  SELECT * INTO _c FROM public.v2_supply_commitments WHERE id = _commitment_id;
  IF _c.id IS NULL THEN RAISE EXCEPTION 'COMMITMENT_NOT_FOUND'; END IF;
  IF NOT (public.v2_is_org_member(_c.organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid())) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  IF _c.status = 'fulfilled' THEN RAISE EXCEPTION 'COMMITMENT_ALREADY_FULFILLED'; END IF;

  UPDATE public.v2_supply_commitments
     SET status = (CASE WHEN _cancel THEN 'cancelled' ELSE 'released' END)::public.v2_commitment_status,
         cancellation_reason = _reason, closed_at = now(), contact_released = false
   WHERE id = _commitment_id;

  UPDATE public.v2_reconfirmation_tasks SET status = 'cancelled', completed_at = now()
   WHERE commitment_id = _commitment_id AND status IN ('open','assigned','in_progress');

  IF _c.sourcing_request_id IS NOT NULL THEN
    INSERT INTO public.v2_sourcing_events (sourcing_request_id, event_type, payload, actor_id)
    VALUES (_c.sourcing_request_id, 'commitment_released',
            jsonb_build_object('commitment_id', _c.id, 'reason', _reason), auth.uid());
  END IF;
END;
$$;

-- 4. EXPIRY — confirmed commitments that never became an order are freed.
CREATE OR REPLACE FUNCTION public.v2_expire_commitments()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _n int;
BEGIN
  WITH expired AS (
    UPDATE public.v2_supply_commitments c
       SET status = 'expired', closed_at = now(), contact_released = false
     WHERE c.status IN ('proposed','pending_confirmation','confirmed','partially_confirmed')
       AND c.expires_at IS NOT NULL AND c.expires_at < now()
       AND NOT EXISTS (
         SELECT 1 FROM public.v2_procurement_orders o
         WHERE o.commitment_id = c.id AND o.status NOT IN ('cancelled','expired'))
    RETURNING c.id)
  SELECT count(*) INTO _n FROM expired;
  RETURN _n;
END;
$$;

-- ========================= CONTROLLED CONTACT RELEASE ========================
-- A processor sees a supplier's commercial identity ONLY after that supplier has
-- confirmed for one of the processor's commitments (or an active order exists).
CREATE OR REPLACE FUNCTION public.v2_supplier_commercial_contact(_supplier_id uuid, _organization_id uuid)
RETURNS TABLE(
  supplier_id uuid, supplier_code text, display_name text, phone text,
  commune text, department text, supplier_type text, released boolean
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _ok boolean;
BEGIN
  IF NOT (public.v2_is_org_member(_organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid())) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  _ok := EXISTS (
    SELECT 1 FROM public.v2_supply_commitments c
    WHERE c.supplier_id = _supplier_id
      AND c.organization_id = _organization_id
      AND c.status IN ('confirmed','partially_confirmed','fulfilled')
      AND c.contact_released
  ) OR EXISTS (
    SELECT 1 FROM public.v2_procurement_orders o
    WHERE o.supplier_id = _supplier_id AND o.organization_id = _organization_id
      AND o.status NOT IN ('cancelled','expired')
  );

  IF NOT _ok THEN
    RETURN QUERY SELECT s.id, s.supplier_code, NULL::text, NULL::text, NULL::text, NULL::text,
                        s.supplier_type::text, false
                 FROM public.v2_suppliers s WHERE s.id = _supplier_id;
  ELSE
    RETURN QUERY SELECT s.id, s.supplier_code, s.display_name, s.phone, s.commune, s.department,
                        s.supplier_type::text, true
                 FROM public.v2_suppliers s WHERE s.id = _supplier_id;
  END IF;
END;
$$;

-- ============================ PROCUREMENT ORDER =============================
CREATE OR REPLACE FUNCTION public.v2_create_procurement_order(
  _commitment_id uuid,
  _expected_start date DEFAULT NULL,
  _expected_end date DEFAULT NULL,
  _delivery_location text DEFAULT NULL,
  _unit_price numeric DEFAULT NULL,
  _price_unit text DEFAULT NULL,
  _quality_requirement text DEFAULT NULL,
  _packaging_requirement text DEFAULT NULL,
  _notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _c public.v2_supply_commitments%ROWTYPE;
  _req public.v2_sourcing_requests%ROWTYPE;
  _order uuid;
  _number text;
  _price numeric;
  _punit text;
  _amount numeric;
  _qty numeric;
BEGIN
  SELECT * INTO _c FROM public.v2_supply_commitments WHERE id = _commitment_id;
  IF _c.id IS NULL THEN RAISE EXCEPTION 'COMMITMENT_NOT_FOUND'; END IF;
  IF NOT public.v2_is_org_member(_c.organization_id, auth.uid()) THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;
  IF _c.status NOT IN ('confirmed','partially_confirmed') THEN
    RAISE EXCEPTION 'COMMITMENT_NOT_CONFIRMED:%', _c.status;
  END IF;
  IF EXISTS (SELECT 1 FROM public.v2_procurement_orders o
             WHERE o.commitment_id = _commitment_id AND o.status NOT IN ('cancelled','expired')) THEN
    RAISE EXCEPTION 'ORDER_ALREADY_EXISTS';
  END IF;

  SELECT * INTO _req FROM public.v2_sourcing_requests WHERE id = _c.sourcing_request_id;

  _qty   := _c.confirmed_quantity;
  _price := COALESCE(_unit_price, _c.agreed_unit_price);
  _punit := COALESCE(_price_unit, _c.price_unit, _c.unit_code);
  _amount := CASE
    WHEN _price IS NULL THEN NULL
    WHEN _punit = _c.unit_code THEN round(_price * _qty, 2)
    WHEN _punit = 'kg' AND _c.unit_code = 't' THEN round(_price * _qty * 1000, 2)
    WHEN _punit = 't' AND _c.unit_code = 'kg' THEN round(_price * _qty / 1000, 2)
    ELSE round(_price * _qty, 2) END;

  _number := 'PO-' || to_char(now(), 'YYMM') || '-' ||
             lpad(nextval('public.v2_procurement_order_seq')::text, 4, '0');

  INSERT INTO public.v2_procurement_orders (
    order_number, organization_id, facility_id, supplier_id, sourcing_request_id, commitment_id,
    expected_delivery_start, expected_delivery_end, delivery_location, quality_requirement,
    packaging_requirement, currency, total_expected_amount, commercial_notes, status, created_by
  ) VALUES (
    _number, _c.organization_id, _c.facility_id, _c.supplier_id, _c.sourcing_request_id, _c.id,
    COALESCE(_expected_start, _c.confirmed_start), COALESCE(_expected_end, _c.confirmed_end),
    COALESCE(_delivery_location, (SELECT f.name || COALESCE(' — ' || f.commune, '')
                                  FROM public.v2_processing_facilities f WHERE f.id = _c.facility_id)),
    COALESCE(_quality_requirement, _req.quality_requirement),
    COALESCE(_packaging_requirement, _req.packaging_requirement),
    _c.currency, _amount, _notes, 'confirmed', auth.uid()
  ) RETURNING id INTO _order;

  INSERT INTO public.v2_procurement_order_lines (
    order_id, supply_id, commitment_id, crop_id, variety_id,
    ordered_quantity, ordered_tonnes, unit_code, agreed_unit_price, price_unit, line_amount
  ) VALUES (
    _order, _c.supply_id, _c.id, _c.crop_id, _c.variety_id,
    _qty, _c.confirmed_tonnes, _c.unit_code, _price, _punit, _amount
  );

  UPDATE public.v2_supply_commitments SET expires_at = NULL WHERE id = _c.id;

  INSERT INTO public.v2_notification_events (organization_id, supplier_id, event_type, payload)
  VALUES (_c.organization_id, _c.supplier_id, 'ORDER_CONFIRMED',
          jsonb_build_object('order_id', _order, 'order_number', _number));

  IF _c.sourcing_request_id IS NOT NULL THEN
    INSERT INTO public.v2_sourcing_events (sourcing_request_id, event_type, payload, actor_id)
    VALUES (_c.sourcing_request_id, 'procurement_order_created',
            jsonb_build_object('order_id', _order, 'order_number', _number, 'tonnes', _c.confirmed_tonnes), auth.uid());
  END IF;

  RETURN _order;
END;
$$;

CREATE OR REPLACE FUNCTION public.v2_cancel_procurement_order(_order_id uuid, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _o public.v2_procurement_orders%ROWTYPE;
BEGIN
  SELECT * INTO _o FROM public.v2_procurement_orders WHERE id = _order_id;
  IF _o.id IS NULL THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  IF NOT public.v2_is_org_member(_o.organization_id, auth.uid()) THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;
  IF _o.status IN ('delivered') THEN RAISE EXCEPTION 'ORDER_ALREADY_DELIVERED'; END IF;

  UPDATE public.v2_procurement_orders
     SET status = 'cancelled', cancellation_reason = _reason, cancelled_at = now()
   WHERE id = _order_id;
  UPDATE public.v2_deliveries SET status = 'cancelled'
   WHERE order_id = _order_id AND status IN ('scheduled','in_transit');

  -- release whatever was never received (history is preserved)
  UPDATE public.v2_supply_commitments
     SET status = 'released', cancellation_reason = _reason, closed_at = now()
   WHERE id = _o.commitment_id AND status IN ('confirmed','partially_confirmed');
END;
$$;

-- ============================== GOODS RECEIPT ===============================
-- Inventory increases ONLY here, and only by the accepted quantity.
CREATE OR REPLACE FUNCTION public.v2_receive_goods(
  _delivery_id uuid,
  _delivered_quantity numeric,
  _accepted_quantity numeric,
  _rejected_quantity numeric DEFAULT 0,
  _unit_code text DEFAULT NULL,
  _quality_result text DEFAULT 'accepted',
  _quality_grade text DEFAULT NULL,
  _condition_notes text DEFAULT NULL,
  _receiving_notes text DEFAULT NULL,
  _photos jsonb DEFAULT '[]'::jsonb,
  _accept_over_delivery boolean DEFAULT false,
  _storage_location text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _d public.v2_deliveries%ROWTYPE;
  _o public.v2_procurement_orders%ROWTYPE;
  _line public.v2_procurement_order_lines%ROWTYPE;
  _unit text;
  _delivered_t numeric; _accepted_t numeric; _rejected_t numeric;
  _already numeric; _over numeric;
  _receipt uuid; _batch uuid; _ref text;
  _farm uuid; _cycle uuid;
BEGIN
  SELECT * INTO _d FROM public.v2_deliveries WHERE id = _delivery_id FOR UPDATE;
  IF _d.id IS NULL THEN RAISE EXCEPTION 'DELIVERY_NOT_FOUND'; END IF;
  IF NOT public.v2_is_org_member(_d.organization_id, auth.uid()) THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;
  IF _d.status IN ('received','cancelled','rejected') THEN RAISE EXCEPTION 'DELIVERY_ALREADY_CLOSED:%', _d.status; END IF;

  SELECT * INTO _o FROM public.v2_procurement_orders WHERE id = _d.order_id;
  SELECT * INTO _line FROM public.v2_procurement_order_lines WHERE order_id = _d.order_id ORDER BY created_at LIMIT 1;

  _unit := COALESCE(_unit_code, _d.unit_code, 't');
  _delivered_t := COALESCE(public.v2_to_tonnes(_delivered_quantity, _unit), _delivered_quantity);
  _accepted_t  := COALESCE(public.v2_to_tonnes(_accepted_quantity, _unit), _accepted_quantity);
  _rejected_t  := COALESCE(public.v2_to_tonnes(COALESCE(_rejected_quantity, 0), _unit), 0);

  IF _accepted_t < 0 OR _delivered_t < 0 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
  IF round(_accepted_t + _rejected_t, 3) > round(_delivered_t, 3) THEN
    RAISE EXCEPTION 'ACCEPTED_PLUS_REJECTED_EXCEEDS_DELIVERED';
  END IF;

  -- over-delivery must be explicitly accepted by the processor
  SELECT COALESCE(sum(gr.accepted_tonnes), 0) INTO _already
  FROM public.v2_goods_receipts gr WHERE gr.order_id = _d.order_id;
  _over := round(GREATEST(0, (_already + _accepted_t) - COALESCE(_line.ordered_tonnes, 0)), 3);
  IF _over > 0 AND NOT _accept_over_delivery THEN
    RAISE EXCEPTION 'OVER_DELIVERY_REQUIRES_CONFIRMATION:%', _over
      USING HINT = 'Accepting this receipt would exceed the ordered quantity by ' || _over || ' t';
  END IF;

  _ref := 'GR-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(_delivery_id::text, '-', ''), 1, 5));

  INSERT INTO public.v2_goods_receipts (
    reference, delivery_id, order_id, organization_id, facility_id, supplier_id,
    delivered_quantity, accepted_quantity, rejected_quantity, unit_code,
    delivered_tonnes, accepted_tonnes, rejected_tonnes,
    quality_result, quality_grade, condition_notes, receiving_notes, photos,
    over_delivery_tonnes, over_delivery_accepted, received_by
  ) VALUES (
    _ref, _delivery_id, _d.order_id, _d.organization_id, _d.facility_id, _d.supplier_id,
    _delivered_quantity, _accepted_quantity, COALESCE(_rejected_quantity, 0), _unit,
    _delivered_t, _accepted_t, _rejected_t,
    COALESCE(_quality_result, 'accepted')::public.v2_receipt_quality, _quality_grade,
    _condition_notes, _receiving_notes, COALESCE(_photos, '[]'::jsonb),
    _over, _accept_over_delivery, auth.uid()
  ) RETURNING id INTO _receipt;

  -- traceable batch + inventory posting (accepted quantity only)
  IF _accepted_t > 0 THEN
    SELECT cc.id, fp.farm_id INTO _cycle, _farm
    FROM public.v2_supply_availability sa
    LEFT JOIN public.v2_crop_cycles cc ON cc.id = sa.crop_cycle_id
    LEFT JOIN public.v2_farm_parcels fp ON fp.id = cc.parcel_id
    WHERE sa.id = _line.supply_id;

    INSERT INTO public.v2_raw_material_batches (
      batch_reference, organization_id, facility_id, crop_id, variety_id, supplier_id,
      farm_id, crop_cycle_id, supply_id, order_id, delivery_id, receipt_id,
      received_tonnes, current_tonnes, unit_code, receipt_date,
      quality_status, quality_grade, storage_location
    ) VALUES (
      'BATCH-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(_receipt::text, '-', ''), 1, 5)),
      _d.organization_id, _d.facility_id, _line.crop_id, _line.variety_id, _d.supplier_id,
      _farm, _cycle, _line.supply_id, _d.order_id, _delivery_id, _receipt,
      _accepted_t, _accepted_t, 't', COALESCE(_d.actual_arrival_date, current_date),
      COALESCE(_quality_result, 'accepted')::public.v2_receipt_quality, _quality_grade, _storage_location
    ) RETURNING id INTO _batch;

    INSERT INTO public.v2_inventory_movements (
      organization_id, facility_id, batch_id, crop_id, variety_id, movement_type,
      quantity_tonnes, reference_type, reference_id, notes, created_by
    ) VALUES (
      _d.organization_id, _d.facility_id, _batch, _line.crop_id, _line.variety_id, 'receipt',
      _accepted_t, 'goods_receipt', _receipt, _ref, auth.uid()
    );
  END IF;

  UPDATE public.v2_procurement_order_lines
     SET received_tonnes = received_tonnes + _delivered_t,
         accepted_tonnes = accepted_tonnes + _accepted_t,
         rejected_tonnes = rejected_tonnes + _rejected_t
   WHERE id = _line.id;

  UPDATE public.v2_deliveries
     SET status = (CASE WHEN _accepted_t = 0 THEN 'rejected'
                        WHEN _rejected_t > 0 THEN 'partially_accepted'
                        ELSE 'received' END)::public.v2_delivery_status,
         received_quantity = _accepted_quantity,
         actual_arrival_date = COALESCE(actual_arrival_date, current_date)
   WHERE id = _delivery_id;

  UPDATE public.v2_procurement_orders o
     SET status = (CASE
        WHEN (SELECT COALESCE(sum(l.accepted_tonnes), 0) FROM public.v2_procurement_order_lines l WHERE l.order_id = o.id)
             >= COALESCE(_line.ordered_tonnes, 0) - 0.001 THEN 'delivered'
        ELSE 'partially_delivered' END)::public.v2_procurement_status
   WHERE o.id = _d.order_id;

  UPDATE public.v2_supply_commitments c
     SET status = 'fulfilled', closed_at = now()
   WHERE c.id = _o.commitment_id
     AND (SELECT status FROM public.v2_procurement_orders WHERE id = _d.order_id) = 'delivered';

  INSERT INTO public.v2_notification_events (organization_id, supplier_id, event_type, payload)
  VALUES (_d.organization_id, _d.supplier_id, 'DELIVERY_RECEIVED',
          jsonb_build_object('receipt_id', _receipt, 'accepted_tonnes', _accepted_t, 'order_id', _d.order_id));

  IF _o.sourcing_request_id IS NOT NULL THEN
    INSERT INTO public.v2_sourcing_events (sourcing_request_id, event_type, payload, actor_id)
    VALUES (_o.sourcing_request_id, 'goods_received',
            jsonb_build_object('receipt_id', _receipt, 'accepted_tonnes', _accepted_t,
                               'delivered_tonnes', _delivered_t, 'rejected_tonnes', _rejected_t), auth.uid());
  END IF;

  RETURN _receipt;
END;
$$;

-- ============================ READ-SIDE HELPERS =============================
CREATE OR REPLACE FUNCTION public.v2_sourcing_funnel(_request_id uuid)
RETURNS TABLE(
  requested_tonnes numeric, identified_tonnes numeric, confirmed_tonnes numeric,
  ordered_tonnes numeric, received_tonnes numeric, accepted_tonnes numeric,
  remaining_to_confirm numeric, remaining_to_receive numeric
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH r AS (
    SELECT * FROM public.v2_sourcing_requests sr
    WHERE sr.id = _request_id
      AND (public.v2_is_org_member(sr.organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()))
  ),
  req AS (SELECT COALESCE(public.v2_to_tonnes(r.requested_quantity, r.unit_code), r.requested_quantity) AS t FROM r),
  ident AS (
    SELECT COALESCE((SELECT mr.identified_tonnes FROM public.v2_sourcing_match_runs mr
                     WHERE mr.sourcing_request_id = _request_id
                     ORDER BY mr.created_at DESC LIMIT 1), 0) AS t
  ),
  conf AS (
    SELECT COALESCE(sum(c.confirmed_tonnes), 0) AS t
    FROM public.v2_supply_commitments c
    WHERE c.sourcing_request_id = _request_id
      AND c.status IN ('confirmed','partially_confirmed','fulfilled')
  ),
  ord AS (
    SELECT COALESCE(sum(l.ordered_tonnes), 0) AS t,
           COALESCE(sum(l.received_tonnes), 0) AS recv,
           COALESCE(sum(l.accepted_tonnes), 0) AS acc
    FROM public.v2_procurement_order_lines l
    JOIN public.v2_procurement_orders o ON o.id = l.order_id
    WHERE o.sourcing_request_id = _request_id AND o.status <> 'cancelled'
  )
  SELECT round((SELECT t FROM req), 2), round((SELECT t FROM ident), 2), round((SELECT t FROM conf), 2),
         round((SELECT t FROM ord), 2), round((SELECT recv FROM ord), 2), round((SELECT acc FROM ord), 2),
         round(GREATEST(0, (SELECT t FROM req) - (SELECT t FROM conf)), 2),
         round(GREATEST(0, (SELECT t FROM ord) - (SELECT acc FROM ord)), 2)
  FROM r
$$;

CREATE OR REPLACE FUNCTION public.v2_inventory_balance(_organization_id uuid, _facility_id uuid DEFAULT NULL)
RETURNS TABLE(
  crop_id uuid, crop_name_fr text, crop_name_en text, variety_id uuid,
  variety_name_fr text, variety_name_en text, balance_tonnes numeric,
  batch_count bigint, last_movement_at timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT m.crop_id, c.name_fr, c.name_en, m.variety_id, v.name_fr, v.name_en,
         round(sum(CASE WHEN m.movement_type = 'adjustment_out' THEN -m.quantity_tonnes ELSE m.quantity_tonnes END), 3),
         count(DISTINCT m.batch_id), max(m.created_at)
  FROM public.v2_inventory_movements m
  LEFT JOIN public.v2_crops c ON c.id = m.crop_id
  LEFT JOIN public.v2_crop_varieties v ON v.id = m.variety_id
  WHERE m.organization_id = _organization_id
    AND (_facility_id IS NULL OR m.facility_id = _facility_id)
    AND (public.v2_is_org_member(_organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()))
  GROUP BY m.crop_id, c.name_fr, c.name_en, m.variety_id, v.name_fr, v.name_en
$$;

-- commercial supply feed for a request: commitments + their orders
CREATE OR REPLACE FUNCTION public.v2_request_commitments(_request_id uuid)
RETURNS TABLE(
  commitment_id uuid, supplier_id uuid, supplier_ref text, supplier_code text,
  contact_name text, contact_phone text, contact_released boolean,
  supply_id uuid, crop_name_fr text, crop_name_en text, variety_name_fr text, variety_name_en text,
  proposed_tonnes numeric, confirmed_tonnes numeric, unit_code text,
  status text, confirmation_method text, confirmed_at timestamptz, expires_at timestamptz,
  agreed_unit_price numeric, currency text, requested_start date, requested_end date,
  confirmed_start date, confirmed_end date, notes text,
  order_id uuid, order_number text, order_status text,
  ordered_tonnes numeric, accepted_tonnes numeric, task_status text, created_at timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT c.id, c.supplier_id,
         CASE WHEN s.supplier_type::text = 'cooperative'
              THEN 'Coopérative ' || CASE WHEN s.status::text = 'field_verified' THEN 'vérifiée' ELSE 'enregistrée' END || ' ' || s.supplier_code
              ELSE 'Producteur ' || CASE WHEN s.status::text = 'field_verified' THEN 'vérifié' ELSE 'enregistré' END || ' ' || s.supplier_code
         END,
         s.supplier_code,
         CASE WHEN c.contact_released THEN s.display_name ELSE NULL END,
         CASE WHEN c.contact_released THEN s.phone ELSE NULL END,
         c.contact_released,
         c.supply_id, cr.name_fr, cr.name_en, v.name_fr, v.name_en,
         c.proposed_tonnes, c.confirmed_tonnes, c.unit_code,
         c.status::text, c.confirmation_method::text, c.confirmed_at, c.expires_at,
         c.agreed_unit_price, c.currency, c.requested_start, c.requested_end,
         c.confirmed_start, c.confirmed_end, c.notes,
         o.id, o.order_number, o.status::text,
         COALESCE(l.ordered_tonnes, 0), COALESCE(l.accepted_tonnes, 0),
         (SELECT t.status::text FROM public.v2_reconfirmation_tasks t
           WHERE t.commitment_id = c.id ORDER BY t.created_at DESC LIMIT 1),
         c.created_at
  FROM public.v2_supply_commitments c
  JOIN public.v2_suppliers s ON s.id = c.supplier_id
  LEFT JOIN public.v2_crops cr ON cr.id = c.crop_id
  LEFT JOIN public.v2_crop_varieties v ON v.id = c.variety_id
  LEFT JOIN public.v2_procurement_orders o ON o.commitment_id = c.id AND o.status <> 'cancelled'
  LEFT JOIN public.v2_procurement_order_lines l ON l.order_id = o.id
  WHERE c.sourcing_request_id = _request_id
    AND (public.v2_is_org_member(c.organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()))
  ORDER BY c.created_at
$$;

-- field-agent / supplier commercial confirmation queue
CREATE OR REPLACE FUNCTION public.v2_commercial_confirmation_feed()
RETURNS TABLE(
  commitment_id uuid, task_id uuid, supplier_id uuid, supplier_name text, supplier_code text,
  commune text, phone text, crop_name_fr text, crop_name_en text,
  variety_name_fr text, variety_name_en text, proposed_quantity numeric, proposed_tonnes numeric,
  unit_code text, requested_start date, requested_end date, target_price numeric, currency text,
  processor_name text, status text, expires_at timestamptz, created_at timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT c.id, t.id, s.id, s.display_name, s.supplier_code, s.commune, s.phone,
         cr.name_fr, cr.name_en, v.name_fr, v.name_en,
         c.proposed_quantity, c.proposed_tonnes, c.unit_code,
         c.requested_start, c.requested_end, c.agreed_unit_price, c.currency,
         o.name, c.status::text, c.expires_at, c.created_at
  FROM public.v2_supply_commitments c
  JOIN public.v2_suppliers s ON s.id = c.supplier_id
  JOIN public.v2_organizations o ON o.id = c.organization_id
  LEFT JOIN public.v2_crops cr ON cr.id = c.crop_id
  LEFT JOIN public.v2_crop_varieties v ON v.id = c.variety_id
  LEFT JOIN public.v2_reconfirmation_tasks t ON t.commitment_id = c.id
  WHERE c.status IN ('proposed','pending_confirmation')
    AND (
      public.v2_is_agrigrid_admin(auth.uid())
      OR s.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.v2_supplier_assignments a
        JOIN public.v2_field_agents fa ON fa.id = a.field_agent_id AND fa.status = 'active'
        WHERE a.supplier_id = c.supplier_id AND fa.user_id = auth.uid())
    )
  ORDER BY c.expires_at NULLS LAST, c.created_at
$$;

-- processor operations overview
CREATE OR REPLACE FUNCTION public.v2_procurement_summary(_organization_id uuid)
RETURNS TABLE(
  open_requests bigint, pending_confirmations bigint, confirmed_tonnes numeric,
  open_orders bigint, ordered_tonnes numeric, expected_deliveries bigint,
  received_tonnes_30d numeric, inventory_tonnes numeric
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT
    (SELECT count(*) FROM public.v2_sourcing_requests r
      WHERE r.organization_id = _organization_id
        AND r.status NOT IN ('draft','cancelled','expired','covered')),
    (SELECT count(*) FROM public.v2_supply_commitments c
      WHERE c.organization_id = _organization_id AND c.status IN ('proposed','pending_confirmation')),
    (SELECT round(COALESCE(sum(c.confirmed_tonnes), 0), 2) FROM public.v2_supply_commitments c
      WHERE c.organization_id = _organization_id AND c.status IN ('confirmed','partially_confirmed')),
    (SELECT count(*) FROM public.v2_procurement_orders o
      WHERE o.organization_id = _organization_id
        AND o.status IN ('draft','pending_supplier_confirmation','confirmed','ready_for_delivery','partially_delivered')),
    (SELECT round(COALESCE(sum(l.ordered_tonnes), 0), 2)
       FROM public.v2_procurement_order_lines l JOIN public.v2_procurement_orders o ON o.id = l.order_id
      WHERE o.organization_id = _organization_id AND o.status NOT IN ('cancelled','expired')),
    (SELECT count(*) FROM public.v2_deliveries d
      WHERE d.organization_id = _organization_id AND d.status IN ('scheduled','in_transit','arrived')),
    (SELECT round(COALESCE(sum(gr.accepted_tonnes), 0), 2) FROM public.v2_goods_receipts gr
      WHERE gr.organization_id = _organization_id AND gr.received_at > now() - interval '30 days'),
    (SELECT round(COALESCE(sum(CASE WHEN m.movement_type = 'adjustment_out' THEN -m.quantity_tonnes ELSE m.quantity_tonnes END), 0), 3)
       FROM public.v2_inventory_movements m WHERE m.organization_id = _organization_id)
  WHERE public.v2_is_org_member(_organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid())
$$;

-- ============ EXISTING FEEDS NOW RETURN COMMERCIALLY REMAINING VOLUME =======
-- quantity_tonnes = physical confirmed availability MINUS confirmed commitments.
-- Field observation history (quantity_available) is untouched.
CREATE OR REPLACE FUNCTION public.v2_commercial_supply(_facility_id uuid DEFAULT NULL::uuid, _crop_id uuid DEFAULT NULL::uuid, _variety_id uuid DEFAULT NULL::uuid, _department text DEFAULT NULL::text, _commune text DEFAULT NULL::text, _search text DEFAULT NULL::text, _freshness text[] DEFAULT NULL::text[], _confidence text[] DEFAULT NULL::text[], _min_quantity_t numeric DEFAULT NULL::numeric, _available_from date DEFAULT NULL::date, _available_to date DEFAULT NULL::date, _max_distance_km numeric DEFAULT NULL::numeric, _verified_only boolean DEFAULT false, _quality_grade text DEFAULT NULL::text, _limit integer DEFAULT 100, _offset integer DEFAULT 0)
 RETURNS TABLE(supply_id uuid, crop_id uuid, crop_code text, crop_name_fr text, crop_name_en text, variety_id uuid, variety_code text, variety_name_fr text, variety_name_en text, quantity numeric, unit_code text, quantity_tonnes numeric, availability_start date, availability_end date, quality_grade text, certification_status text, supply_status text, freshness text, confidence text, verification_status text, supplier_ref text, supplier_type text, department text, commune text, approx_latitude numeric, approx_longitude numeric, distance_km numeric, last_confirmed_at timestamp with time zone, total_count bigint)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH guard AS (SELECT public.v2_can_read_commercial_supply(auth.uid()) AS ok),
  facility AS (SELECT f.latitude AS lat, f.longitude AS lng FROM public.v2_processing_facilities f WHERE f.id = _facility_id),
  base AS (
    SELECT
      sa.id AS supply_id, sa.crop_id, c.code AS crop_code, c.name_fr AS crop_name_fr, c.name_en AS crop_name_en,
      sa.variety_id, v.code AS variety_code, v.name_fr AS variety_name_fr, v.name_en AS variety_name_en,
      sa.quantity_available AS quantity, sa.unit_code,
      public.v2_supply_remaining_tonnes(sa.id) AS quantity_tonnes,
      sa.availability_start, sa.availability_end, sa.quality_grade, sa.certification_status,
      sa.status::text AS supply_status,
      public.v2_freshness_status(COALESCE(sa.last_confirmed_at, sa.updated_at)) AS freshness,
      s.status::text AS supplier_status,
      CASE WHEN s.status::text = 'field_verified' THEN 'field_verified' ELSE 'unverified' END AS verification_status,
      CASE WHEN s.supplier_type::text = 'cooperative'
        THEN 'Coopérative ' || CASE WHEN s.status::text = 'field_verified' THEN 'vérifiée' ELSE 'enregistrée' END || ' ' || s.supplier_code
        ELSE 'Producteur ' || CASE WHEN s.status::text = 'field_verified' THEN 'vérifié' ELSE 'enregistré' END || ' ' || s.supplier_code
      END AS supplier_ref,
      s.supplier_type::text AS supplier_type, s.department, s.commune,
      public.v2_approx_coord(s.latitude) AS approx_latitude,
      public.v2_approx_coord(s.longitude) AS approx_longitude,
      public.v2_distance_km((SELECT lat FROM facility), (SELECT lng FROM facility), s.latitude, s.longitude) AS distance_km,
      sa.last_confirmed_at
    FROM public.v2_supply_availability sa
    JOIN public.v2_suppliers s ON s.id = sa.supplier_id
    JOIN public.v2_crops c     ON c.id = sa.crop_id
    LEFT JOIN public.v2_crop_varieties v ON v.id = sa.variety_id
    WHERE (SELECT ok FROM guard) AND s.is_active AND sa.status IN ('available','expected','forecast')
  ),
  scored AS (
    SELECT b.*, public.v2_supply_confidence(b.supplier_status, b.freshness, b.supply_status, b.last_confirmed_at,
             b.variety_id IS NOT NULL, b.availability_start IS NOT NULL) AS confidence
    FROM base b
  ),
  filtered AS (
    SELECT * FROM scored
    WHERE COALESCE(quantity_tonnes, 0) > 0
      AND (_crop_id IS NULL OR crop_id = _crop_id)
      AND (_variety_id IS NULL OR variety_id = _variety_id)
      AND (_department IS NULL OR department = _department)
      AND (_commune IS NULL OR commune = _commune)
      AND (_quality_grade IS NULL OR quality_grade = _quality_grade)
      AND (_freshness IS NULL OR freshness = ANY(_freshness))
      AND (_confidence IS NULL OR confidence = ANY(_confidence))
      AND (_min_quantity_t IS NULL OR COALESCE(quantity_tonnes, 0) >= _min_quantity_t)
      AND (_available_from IS NULL OR COALESCE(availability_end, availability_start, _available_from) >= _available_from)
      AND (_available_to IS NULL OR COALESCE(availability_start, availability_end, _available_to) <= _available_to)
      AND (_max_distance_km IS NULL OR (distance_km IS NOT NULL AND distance_km <= _max_distance_km))
      AND (NOT _verified_only OR verification_status = 'field_verified')
      AND (_search IS NULL OR _search = '' OR
        crop_name_fr ILIKE '%' || _search || '%' OR crop_name_en ILIKE '%' || _search || '%' OR
        COALESCE(variety_name_fr,'') ILIKE '%' || _search || '%' OR COALESCE(variety_name_en,'') ILIKE '%' || _search || '%' OR
        COALESCE(commune,'') ILIKE '%' || _search || '%' OR COALESCE(department,'') ILIKE '%' || _search || '%' OR
        supplier_ref ILIKE '%' || _search || '%')
  )
  SELECT supply_id, crop_id, crop_code, crop_name_fr, crop_name_en, variety_id, variety_code, variety_name_fr, variety_name_en,
         quantity, unit_code, quantity_tonnes, availability_start, availability_end, quality_grade, certification_status,
         supply_status, freshness, confidence, verification_status, supplier_ref, supplier_type, department, commune,
         approx_latitude, approx_longitude, distance_km, last_confirmed_at, count(*) OVER () AS total_count
  FROM filtered
  ORDER BY CASE WHEN distance_km IS NULL THEN 1 ELSE 0 END, distance_km NULLS LAST, quantity_tonnes DESC NULLS LAST
  LIMIT COALESCE(_limit, 100) OFFSET COALESCE(_offset, 0)
$function$;

CREATE OR REPLACE FUNCTION public.v2_sourcing_matches(_request_id uuid)
 RETURNS TABLE(supply_id uuid, supplier_ref text, supplier_type text, supplier_status text, crop_id uuid, crop_name_fr text, crop_name_en text, variety_id uuid, variety_name_fr text, variety_name_en text, quantity_tonnes numeric, quantity numeric, unit_code text, availability_start date, availability_end date, overlap_days integer, distance_km numeric, freshness text, confidence text, verification_status text, quality_grade text, certification_status text, supply_status text, last_confirmed_at timestamp with time zone, department text, commune text, approx_latitude numeric, approx_longitude numeric, match_class text, score numeric, score_breakdown jsonb, reasons jsonb, blocking_reasons text[])
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH req AS (
    SELECT r.* FROM public.v2_sourcing_requests r
    WHERE r.id = _request_id
      AND (public.v2_is_org_member(r.organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()))
  ),
  w AS (
    SELECT COALESCE((value->>'product')::numeric, 30) AS w_product,
           COALESCE((value->>'availability')::numeric, 20) AS w_avail,
           COALESCE((value->>'distance')::numeric, 20) AS w_dist,
           COALESCE((value->>'freshness')::numeric, 15) AS w_fresh,
           COALESCE((value->>'confidence')::numeric, 10) AS w_conf,
           COALESCE((value->>'quality')::numeric, 5) AS w_qual,
           COALESCE((value->>'soft_radius_factor')::numeric, 1.5) AS soft_factor
    FROM public.v2_settings WHERE key = 'sourcing_match_weights'
  ),
  weights AS (SELECT * FROM w UNION ALL SELECT 30,20,20,15,10,5,1.5 WHERE NOT EXISTS (SELECT 1 FROM w)),
  facility AS (SELECT f.latitude AS lat, f.longitude AS lng FROM public.v2_processing_facilities f JOIN req ON req.facility_id = f.id),
  cand AS (
    SELECT
      sa.id AS supply_id, s.id AS supplier_id,
      CASE WHEN s.supplier_type::text = 'cooperative'
        THEN 'Coopérative ' || CASE WHEN s.status::text = 'field_verified' THEN 'vérifiée' ELSE 'enregistrée' END || ' ' || s.supplier_code
        ELSE 'Producteur ' || CASE WHEN s.status::text = 'field_verified' THEN 'vérifié' ELSE 'enregistré' END || ' ' || s.supplier_code
      END AS supplier_ref,
      s.supplier_type::text AS supplier_type, s.status::text AS supplier_status,
      sa.crop_id, c.name_fr AS crop_name_fr, c.name_en AS crop_name_en,
      sa.variety_id, v.name_fr AS variety_name_fr, v.name_en AS variety_name_en,
      public.v2_supply_remaining_tonnes(sa.id) AS quantity_tonnes,
      sa.quantity_available AS quantity, sa.unit_code,
      sa.availability_start, sa.availability_end,
      GREATEST(0, (LEAST(COALESCE(sa.availability_end, req.availability_end), req.availability_end)
        - GREATEST(COALESCE(sa.availability_start, req.availability_start), req.availability_start)) + 1)::int AS overlap_days,
      (req.availability_end - req.availability_start + 1)::int AS requested_days,
      public.v2_distance_km((SELECT lat FROM facility), (SELECT lng FROM facility), s.latitude, s.longitude) AS distance_km,
      public.v2_freshness_status(COALESCE(sa.last_confirmed_at, sa.updated_at)) AS freshness,
      sa.quality_grade, sa.certification_status, sa.status::text AS supply_status, sa.last_confirmed_at,
      s.department, s.commune,
      public.v2_approx_coord(s.latitude) AS approx_latitude,
      public.v2_approx_coord(s.longitude) AS approx_longitude,
      req.variety_id AS req_variety_id, req.variety_flexible, req.max_distance_km, req.strict_radius,
      req.quality_requirement, req.certification_requirement, req.certification_mandatory
    FROM req
    JOIN public.v2_supply_availability sa ON sa.crop_id = req.crop_id
    JOIN public.v2_suppliers s ON s.id = sa.supplier_id AND s.is_active
    JOIN public.v2_crops c ON c.id = sa.crop_id
    LEFT JOIN public.v2_crop_varieties v ON v.id = sa.variety_id
    WHERE sa.status IN ('available','expected','forecast')
  ),
  scored AS (
    SELECT cand.*,
      public.v2_supply_confidence(cand.supplier_status, cand.freshness, cand.supply_status, cand.last_confirmed_at,
        cand.variety_id IS NOT NULL, cand.availability_start IS NOT NULL) AS confidence,
      CASE WHEN cand.supplier_status = 'field_verified' THEN 'field_verified' ELSE 'unverified' END AS verification_status,
      CASE WHEN cand.req_variety_id IS NULL THEN 1 WHEN cand.variety_id = cand.req_variety_id THEN 1
           WHEN cand.variety_id IS NULL THEN 0.6 ELSE 0.3 END AS f_product,
      LEAST(1, cand.overlap_days::numeric / NULLIF(cand.requested_days, 0)) AS f_avail,
      CASE WHEN cand.distance_km IS NULL THEN 0.4
           ELSE GREATEST(0, 1 - (cand.distance_km / NULLIF(COALESCE(cand.max_distance_km, 100), 0))) END AS f_dist,
      CASE cand.freshness WHEN 'fresh' THEN 1 WHEN 'aging' THEN 0.6 ELSE 0.2 END AS f_fresh,
      CASE public.v2_supply_confidence(cand.supplier_status, cand.freshness, cand.supply_status, cand.last_confirmed_at,
        cand.variety_id IS NOT NULL, cand.availability_start IS NOT NULL)
        WHEN 'high' THEN 1 WHEN 'medium' THEN 0.6 ELSE 0.3 END AS f_conf,
      CASE WHEN cand.quality_requirement IS NULL THEN 1 WHEN cand.quality_grade IS NULL THEN 0.5
           WHEN lower(cand.quality_grade) = lower(cand.quality_requirement) THEN 1 ELSE 0.3 END AS f_qual
    FROM cand
  ),
  classified AS (
    SELECT sc.*, (SELECT soft_factor FROM weights LIMIT 1) AS soft_factor,
      ARRAY_REMOVE(ARRAY[
        CASE WHEN sc.overlap_days <= 0 THEN 'no_window_overlap' END,
        CASE WHEN COALESCE(sc.quantity_tonnes, 0) <= 0 THEN 'no_quantity' END,
        CASE WHEN sc.max_distance_km IS NOT NULL AND sc.strict_radius
                  AND (sc.distance_km IS NULL OR sc.distance_km > sc.max_distance_km) THEN 'outside_strict_radius' END,
        CASE WHEN sc.certification_mandatory AND sc.certification_requirement IS NOT NULL
                  AND COALESCE(lower(sc.certification_status), '') <> lower(sc.certification_requirement)
             THEN 'missing_required_certification' END,
        CASE WHEN sc.req_variety_id IS NOT NULL AND NOT sc.variety_flexible
                  AND (sc.variety_id IS NULL OR sc.variety_id <> sc.req_variety_id) THEN 'variety_mismatch' END,
        CASE WHEN sc.max_distance_km IS NOT NULL AND NOT sc.strict_radius AND sc.distance_km IS NOT NULL
                  AND sc.distance_km > sc.max_distance_km * (SELECT soft_factor FROM weights LIMIT 1) THEN 'far_outside_radius' END,
        CASE WHEN sc.freshness = 'needs_verification' THEN 'stale_data' END
      ], NULL) AS blocking_reasons
    FROM scored sc
  ),
  final AS (
    SELECT cl.*, round((
        (SELECT w_product FROM weights LIMIT 1) * cl.f_product +
        (SELECT w_avail   FROM weights LIMIT 1) * COALESCE(cl.f_avail, 0) +
        (SELECT w_dist    FROM weights LIMIT 1) * cl.f_dist +
        (SELECT w_fresh   FROM weights LIMIT 1) * cl.f_fresh +
        (SELECT w_conf    FROM weights LIMIT 1) * cl.f_conf +
        (SELECT w_qual    FROM weights LIMIT 1) * cl.f_qual), 1) AS score
    FROM classified cl
  )
  SELECT f.supply_id, f.supplier_ref, f.supplier_type, f.supplier_status, f.crop_id, f.crop_name_fr, f.crop_name_en,
    f.variety_id, f.variety_name_fr, f.variety_name_en, f.quantity_tonnes, f.quantity, f.unit_code,
    f.availability_start, f.availability_end, f.overlap_days, f.distance_km, f.freshness, f.confidence,
    f.verification_status, f.quality_grade, f.certification_status, f.supply_status, f.last_confirmed_at,
    f.department, f.commune, f.approx_latitude, f.approx_longitude,
    CASE WHEN cardinality(f.blocking_reasons) = 0 THEN 'match' ELSE 'near_match' END AS match_class,
    f.score,
    jsonb_build_object('product', round(f.f_product, 2), 'availability', round(COALESCE(f.f_avail, 0), 2),
      'distance', round(f.f_dist, 2), 'freshness', round(f.f_fresh, 2), 'confidence', round(f.f_conf, 2),
      'quality', round(f.f_qual, 2)) AS score_breakdown,
    jsonb_build_array(
      jsonb_build_object('code','variety','ok', f.f_product >= 1, 'value', COALESCE(f.variety_name_fr, f.crop_name_fr)),
      jsonb_build_object('code','window','ok', f.overlap_days > 0, 'value', f.overlap_days),
      jsonb_build_object('code','distance','ok', f.distance_km IS NOT NULL AND (f.max_distance_km IS NULL OR f.distance_km <= f.max_distance_km), 'value', f.distance_km),
      jsonb_build_object('code','freshness','ok', f.freshness = 'fresh', 'value', f.freshness, 'confirmed_at', f.last_confirmed_at),
      jsonb_build_object('code','confidence','ok', f.confidence = 'high', 'value', f.confidence),
      jsonb_build_object('code','quantity','ok', true, 'value', f.quantity_tonnes),
      jsonb_build_object('code','quality','ok', f.f_qual >= 1, 'value', f.quality_grade),
      jsonb_build_object('code','certification','ok', NOT f.certification_mandatory
        OR COALESCE(lower(f.certification_status),'') = lower(COALESCE(f.certification_requirement,'')), 'value', f.certification_status)
    ) AS reasons,
    f.blocking_reasons
  FROM final f
  ORDER BY (CASE WHEN cardinality(f.blocking_reasons) = 0 THEN 0 ELSE 1 END), f.score DESC, f.distance_km NULLS LAST
$function$;

-- field task feed now carries the task kind + commitment
DROP FUNCTION IF EXISTS public.v2_reconfirmation_task_feed();
CREATE OR REPLACE FUNCTION public.v2_reconfirmation_task_feed()
 RETURNS TABLE(task_id uuid, supplier_id uuid, supplier_name text, supplier_code text, commune text, crop_id uuid, crop_name_fr text, crop_name_en text, supply_id uuid, current_quantity numeric, current_unit text, reason text, priority text, needed_by date, due_date date, status text, last_confirmed_at timestamp with time zone, created_at timestamp with time zone, task_kind text, commitment_id uuid, proposed_tonnes numeric)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT t.id, s.id, s.display_name, s.supplier_code, s.commune,
         t.crop_id, c.name_fr, c.name_en,
         t.supply_id, sa.quantity_available, sa.unit_code,
         t.reason, t.priority, t.needed_by, t.due_date, t.status::text,
         sa.last_confirmed_at, t.created_at, t.task_kind, t.commitment_id, cm.proposed_tonnes
  FROM public.v2_reconfirmation_tasks t
  JOIN public.v2_suppliers s ON s.id = t.supplier_id
  LEFT JOIN public.v2_crops c ON c.id = t.crop_id
  LEFT JOIN public.v2_supply_availability sa ON sa.id = t.supply_id
  LEFT JOIN public.v2_supply_commitments cm ON cm.id = t.commitment_id
  WHERE public.v2_is_agrigrid_admin(auth.uid())
     OR EXISTS (SELECT 1 FROM public.v2_field_agents fa
                WHERE fa.id = t.field_agent_id AND fa.user_id = auth.uid() AND fa.status = 'active')
  ORDER BY
    CASE t.status WHEN 'open' THEN 0 WHEN 'assigned' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END,
    CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
    t.due_date NULLS LAST
$function$;