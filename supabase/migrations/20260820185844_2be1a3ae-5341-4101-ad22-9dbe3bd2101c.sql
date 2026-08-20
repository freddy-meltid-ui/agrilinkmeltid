
-- ================= AGRI-GRID V2 — Phase 2B: customers, sales, dispatch, payments, expenses, performance
-- Additive only. No V1 or Phase 1/2A object is altered except the FG movement enum (new values).

ALTER TYPE public.v2_fg_movement_type ADD VALUE IF NOT EXISTS 'sale_dispatch';
ALTER TYPE public.v2_fg_movement_type ADD VALUE IF NOT EXISTS 'dispatch_reversal';

CREATE TYPE public.v2_customer_type AS ENUM ('individual','retailer','wholesaler','distributor','supermarket','restaurant_hotel','exporter','institution','other');
CREATE TYPE public.v2_sales_status AS ENUM ('draft','confirmed','partially_fulfilled','fulfilled','cancelled');
CREATE TYPE public.v2_sales_payment_status AS ENUM ('unpaid','partially_paid','paid','cancelled');
CREATE TYPE public.v2_dispatch_status AS ENUM ('posted','reversed');
CREATE TYPE public.v2_payment_method AS ENUM ('cash','bank_transfer','mobile_money','cheque','other');
CREATE TYPE public.v2_expense_category AS ENUM ('raw_materials','packaging','transport','labor','electricity','water','rent','maintenance','certification','marketing','administration','taxes_and_fees','other');
CREATE TYPE public.v2_expense_payment_status AS ENUM ('unpaid','paid');
CREATE TYPE public.v2_cash_account_type AS ENUM ('cash','bank','mobile_money');
CREATE TYPE public.v2_cash_event_type AS ENUM ('customer_payment','other_inflow','procurement_payment','operating_expense','other_outflow');
CREATE TYPE public.v2_allocation_status AS ENUM ('reserved','partially_dispatched','dispatched','released');

-- ---------------------------------------------------------------- references
CREATE OR REPLACE FUNCTION public.v2_next_ref(_organization_id uuid, _prefix text, _table regclass, _column text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer; ref text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(_organization_id::text || _prefix));
  EXECUTE format('SELECT count(*) FROM %s WHERE organization_id = $1', _table) INTO n USING _organization_id;
  LOOP
    n := n + 1;
    ref := _prefix || '-' || to_char(CURRENT_DATE,'YYYY') || '-' || lpad(n::text, 6, '0');
    EXECUTE format('SELECT count(*) FROM %s WHERE organization_id = $1 AND %I = $2', _table, _column) INTO n USING _organization_id, ref;
    IF n = 0 THEN RETURN ref; END IF;
    EXECUTE format('SELECT count(*) FROM %s WHERE organization_id = $1', _table) INTO n USING _organization_id;
  END LOOP;
END $$;

-- ---------------------------------------------------------------- customers
CREATE TABLE public.v2_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  customer_code text NOT NULL,
  customer_type public.v2_customer_type NOT NULL DEFAULT 'other',
  display_name text NOT NULL,
  legal_name text,
  contact_person text,
  phone text,
  email text,
  country text NOT NULL DEFAULT 'BJ',
  department text,
  commune text,
  address text,
  tax_reference text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, customer_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_customers TO authenticated;
GRANT ALL ON public.v2_customers TO service_role;
ALTER TABLE public.v2_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read customers" ON public.v2_customers FOR SELECT TO authenticated
  USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()));
CREATE POLICY "org members write customers" ON public.v2_customers FOR ALL TO authenticated
  USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()))
  WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()));

-- ---------------------------------------------------------------- sales orders
CREATE TABLE public.v2_sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES public.v2_processing_facilities(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES public.v2_customers(id) ON DELETE RESTRICT,
  sales_reference text NOT NULL,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  requested_delivery_date date,
  currency text NOT NULL DEFAULT 'XOF',
  status public.v2_sales_status NOT NULL DEFAULT 'draft',
  payment_status public.v2_sales_payment_status NOT NULL DEFAULT 'unpaid',
  total_amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  commercial_notes text,
  confirmed_at timestamptz,
  fulfilled_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, sales_reference)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_sales_orders TO authenticated;
GRANT ALL ON public.v2_sales_orders TO service_role;
ALTER TABLE public.v2_sales_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read sales" ON public.v2_sales_orders FOR SELECT TO authenticated
  USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()));
CREATE POLICY "org members write sales" ON public.v2_sales_orders FOR ALL TO authenticated
  USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()))
  WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()));

CREATE TABLE public.v2_sales_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id uuid NOT NULL REFERENCES public.v2_sales_orders(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.v2_processed_products(id) ON DELETE RESTRICT,
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit_code text NOT NULL,
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  discount_amount numeric NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  line_total numeric GENERATED ALWAYS AS (round(quantity * unit_price - discount_amount, 2)) STORED,
  dispatched_quantity numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_sales_order_lines TO authenticated;
GRANT ALL ON public.v2_sales_order_lines TO service_role;
ALTER TABLE public.v2_sales_order_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read sale lines" ON public.v2_sales_order_lines FOR SELECT TO authenticated
  USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()));
CREATE POLICY "org members write sale lines" ON public.v2_sales_order_lines FOR ALL TO authenticated
  USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()))
  WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()));

-- ------------------------------------------------------- finished lot allocations
CREATE TABLE public.v2_sales_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  sales_order_id uuid NOT NULL REFERENCES public.v2_sales_orders(id) ON DELETE CASCADE,
  sales_order_line_id uuid NOT NULL REFERENCES public.v2_sales_order_lines(id) ON DELETE CASCADE,
  finished_batch_id uuid NOT NULL REFERENCES public.v2_finished_product_batches(id) ON DELETE RESTRICT,
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit_code text NOT NULL,
  dispatched_quantity numeric NOT NULL DEFAULT 0,
  released_quantity numeric NOT NULL DEFAULT 0,
  status public.v2_allocation_status NOT NULL DEFAULT 'reserved',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_sales_allocations TO authenticated;
GRANT ALL ON public.v2_sales_allocations TO service_role;
ALTER TABLE public.v2_sales_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read allocations" ON public.v2_sales_allocations FOR SELECT TO authenticated
  USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()));
CREATE POLICY "org members write allocations" ON public.v2_sales_allocations FOR ALL TO authenticated
  USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()))
  WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()));

-- ---------------------------------------------------------------- dispatch
CREATE TABLE public.v2_sales_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  sales_order_id uuid NOT NULL REFERENCES public.v2_sales_orders(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.v2_customers(id) ON DELETE RESTRICT,
  facility_id uuid REFERENCES public.v2_processing_facilities(id) ON DELETE SET NULL,
  dispatch_reference text NOT NULL,
  dispatch_date date NOT NULL DEFAULT CURRENT_DATE,
  status public.v2_dispatch_status NOT NULL DEFAULT 'posted',
  notes text,
  reversal_reason text,
  reversed_at timestamptz,
  reversed_by uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, dispatch_reference)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_sales_dispatches TO authenticated;
GRANT ALL ON public.v2_sales_dispatches TO service_role;
ALTER TABLE public.v2_sales_dispatches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read dispatches" ON public.v2_sales_dispatches FOR SELECT TO authenticated
  USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()));
CREATE POLICY "org members write dispatches" ON public.v2_sales_dispatches FOR ALL TO authenticated
  USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()))
  WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()));

CREATE TABLE public.v2_sales_dispatch_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id uuid NOT NULL REFERENCES public.v2_sales_dispatches(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  sales_order_line_id uuid NOT NULL REFERENCES public.v2_sales_order_lines(id) ON DELETE CASCADE,
  allocation_id uuid REFERENCES public.v2_sales_allocations(id) ON DELETE SET NULL,
  finished_batch_id uuid NOT NULL REFERENCES public.v2_finished_product_batches(id) ON DELETE RESTRICT,
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_sales_dispatch_lines TO authenticated;
GRANT ALL ON public.v2_sales_dispatch_lines TO service_role;
ALTER TABLE public.v2_sales_dispatch_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read dispatch lines" ON public.v2_sales_dispatch_lines FOR SELECT TO authenticated
  USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()));
CREATE POLICY "org members write dispatch lines" ON public.v2_sales_dispatch_lines FOR ALL TO authenticated
  USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()))
  WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()));

-- ---------------------------------------------------------------- payments
CREATE TABLE public.v2_customer_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.v2_customers(id) ON DELETE RESTRICT,
  sales_order_id uuid REFERENCES public.v2_sales_orders(id) ON DELETE SET NULL,
  payment_reference text,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'XOF',
  payment_method public.v2_payment_method NOT NULL DEFAULT 'cash',
  cash_account_id uuid,
  is_reversal boolean NOT NULL DEFAULT false,
  reverses_payment_id uuid REFERENCES public.v2_customer_payments(id) ON DELETE SET NULL,
  reversed_at timestamptz,
  reversal_reason text,
  document_path text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_customer_payments TO authenticated;
GRANT ALL ON public.v2_customer_payments TO service_role;
ALTER TABLE public.v2_customer_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read payments" ON public.v2_customer_payments FOR SELECT TO authenticated
  USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()));
CREATE POLICY "org members write payments" ON public.v2_customer_payments FOR ALL TO authenticated
  USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()))
  WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()));

-- ---------------------------------------------------------------- expenses
CREATE TABLE public.v2_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES public.v2_processing_facilities(id) ON DELETE SET NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  category public.v2_expense_category NOT NULL DEFAULT 'other',
  description text NOT NULL,
  payee text,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'XOF',
  payment_status public.v2_expense_payment_status NOT NULL DEFAULT 'unpaid',
  payment_date date,
  payment_method public.v2_payment_method,
  cash_account_id uuid,
  document_path text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_expenses TO authenticated;
GRANT ALL ON public.v2_expenses TO service_role;
ALTER TABLE public.v2_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read expenses" ON public.v2_expenses FOR SELECT TO authenticated
  USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()));
CREATE POLICY "org members write expenses" ON public.v2_expenses FOR ALL TO authenticated
  USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()))
  WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()));

-- ---------------------------------------------------------------- cash
CREATE TABLE public.v2_cash_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  account_type public.v2_cash_account_type NOT NULL DEFAULT 'cash',
  currency text NOT NULL DEFAULT 'XOF',
  opening_balance numeric,
  opening_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_cash_accounts TO authenticated;
GRANT ALL ON public.v2_cash_accounts TO service_role;
ALTER TABLE public.v2_cash_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read cash accounts" ON public.v2_cash_accounts FOR SELECT TO authenticated
  USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()));
CREATE POLICY "org members write cash accounts" ON public.v2_cash_accounts FOR ALL TO authenticated
  USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()))
  WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()));

CREATE TABLE public.v2_cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  cash_account_id uuid REFERENCES public.v2_cash_accounts(id) ON DELETE SET NULL,
  event_type public.v2_cash_event_type NOT NULL,
  movement_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'XOF',
  reference_type text,
  reference_id uuid,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_cash_movements TO authenticated;
GRANT ALL ON public.v2_cash_movements TO service_role;
ALTER TABLE public.v2_cash_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read cash movements" ON public.v2_cash_movements FOR SELECT TO authenticated
  USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()));
CREATE POLICY "org members write cash movements" ON public.v2_cash_movements FOR ALL TO authenticated
  USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()))
  WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()));

-- ---------------------------------------------------------------- documents
CREATE TABLE public.v2_business_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.v2_organizations(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  storage_path text NOT NULL,
  file_name text,
  document_type text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_business_documents TO authenticated;
GRANT ALL ON public.v2_business_documents TO service_role;
ALTER TABLE public.v2_business_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read documents" ON public.v2_business_documents FOR SELECT TO authenticated
  USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()));
CREATE POLICY "org members write documents" ON public.v2_business_documents FOR ALL TO authenticated
  USING (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()))
  WITH CHECK (public.v2_is_org_member(organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()));

-- ---------------------------------------------------------------- updated_at triggers
CREATE TRIGGER trg_v2_customers_updated BEFORE UPDATE ON public.v2_customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_v2_sales_orders_updated BEFORE UPDATE ON public.v2_sales_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_v2_sales_order_lines_updated BEFORE UPDATE ON public.v2_sales_order_lines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_v2_sales_allocations_updated BEFORE UPDATE ON public.v2_sales_allocations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_v2_sales_dispatches_updated BEFORE UPDATE ON public.v2_sales_dispatches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_v2_customer_payments_updated BEFORE UPDATE ON public.v2_customer_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_v2_expenses_updated BEFORE UPDATE ON public.v2_expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_v2_cash_accounts_updated BEFORE UPDATE ON public.v2_cash_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------- order totals
CREATE OR REPLACE FUNCTION public.v2_recalc_sales_order_total()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _order uuid;
BEGIN
  _order := COALESCE(NEW.sales_order_id, OLD.sales_order_id);
  UPDATE public.v2_sales_orders o
     SET total_amount = COALESCE((SELECT round(sum(l.line_total),2) FROM public.v2_sales_order_lines l WHERE l.sales_order_id = _order), 0)
   WHERE o.id = _order;
  PERFORM public.v2_recompute_payment_status(_order);
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.v2_recompute_payment_status(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _paid numeric; _total numeric; _status public.v2_sales_status;
BEGIN
  SELECT total_amount, status INTO _total, _status FROM public.v2_sales_orders WHERE id = _order_id;
  IF _total IS NULL THEN RETURN; END IF;
  SELECT COALESCE(round(sum(CASE WHEN is_reversal THEN -amount ELSE amount END),2),0) INTO _paid
    FROM public.v2_customer_payments WHERE sales_order_id = _order_id;
  UPDATE public.v2_sales_orders
     SET paid_amount = _paid,
         payment_status = CASE
            WHEN _status = 'cancelled' AND _paid = 0 THEN 'cancelled'::public.v2_sales_payment_status
            WHEN _paid <= 0 THEN 'unpaid'::public.v2_sales_payment_status
            WHEN _paid >= _total THEN 'paid'::public.v2_sales_payment_status
            ELSE 'partially_paid'::public.v2_sales_payment_status END
   WHERE id = _order_id;
END $$;

CREATE TRIGGER trg_v2_sales_lines_total AFTER INSERT OR UPDATE OR DELETE ON public.v2_sales_order_lines
FOR EACH ROW EXECUTE FUNCTION public.v2_recalc_sales_order_total();

-- Overpayment is BLOCKED at the database level (documented Phase 2B model).
CREATE OR REPLACE FUNCTION public.v2_guard_customer_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _total numeric; _paid numeric;
BEGIN
  IF NEW.sales_order_id IS NULL THEN RETURN NEW; END IF;
  SELECT total_amount INTO _total FROM public.v2_sales_orders WHERE id = NEW.sales_order_id FOR UPDATE;
  SELECT COALESCE(round(sum(CASE WHEN is_reversal THEN -amount ELSE amount END),2),0) INTO _paid
    FROM public.v2_customer_payments WHERE sales_order_id = NEW.sales_order_id;
  IF NOT NEW.is_reversal AND round(_paid + NEW.amount, 2) > round(_total, 2) THEN
    RAISE EXCEPTION 'OVERPAYMENT_BLOCKED:%', round(_total - _paid, 2);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_v2_guard_customer_payment BEFORE INSERT ON public.v2_customer_payments
FOR EACH ROW EXECUTE FUNCTION public.v2_guard_customer_payment();

CREATE OR REPLACE FUNCTION public.v2_after_customer_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.sales_order_id IS NOT NULL THEN PERFORM public.v2_recompute_payment_status(NEW.sales_order_id); END IF;
  INSERT INTO public.v2_cash_movements (organization_id, cash_account_id, event_type, movement_date, amount, currency, reference_type, reference_id, description)
  VALUES (NEW.organization_id, NEW.cash_account_id, 'customer_payment', NEW.payment_date,
          CASE WHEN NEW.is_reversal THEN -NEW.amount ELSE NEW.amount END, NEW.currency,
          'customer_payment', NEW.id, COALESCE(NEW.notes, NEW.payment_reference));
  RETURN NULL;
END $$;
CREATE TRIGGER trg_v2_after_customer_payment AFTER INSERT ON public.v2_customer_payments
FOR EACH ROW EXECUTE FUNCTION public.v2_after_customer_payment();

-- Paid expenses produce an operational cash outflow.
CREATE OR REPLACE FUNCTION public.v2_after_expense()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND (TG_OP = 'INSERT' OR OLD.payment_status <> 'paid') THEN
    INSERT INTO public.v2_cash_movements (organization_id, cash_account_id, event_type, movement_date, amount, currency, reference_type, reference_id, description)
    VALUES (NEW.organization_id, NEW.cash_account_id, 'operating_expense', COALESCE(NEW.payment_date, NEW.expense_date),
            -NEW.amount, NEW.currency, 'expense', NEW.id, NEW.description);
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_v2_after_expense AFTER INSERT OR UPDATE ON public.v2_expenses
FOR EACH ROW EXECUTE FUNCTION public.v2_after_expense();

-- ================================================================= read models
-- Physical / reserved / available-to-sell per finished lot.
CREATE OR REPLACE FUNCTION public.v2_finished_goods_availability(_organization_id uuid, _facility_id uuid DEFAULT NULL)
RETURNS TABLE (
  finished_batch_id uuid, batch_reference text, product_id uuid, product_name text, unit_code text,
  facility_id uuid, production_date date, expiry_date date, status text,
  physical_quantity numeric, reserved_quantity numeric, available_quantity numeric
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT f.id, f.batch_reference, f.product_id, p.product_name, f.unit_code, f.facility_id,
         f.production_date, f.expiry_date, f.status,
         COALESCE((SELECT round(sum(m.quantity),3) FROM public.v2_finished_goods_movements m WHERE m.finished_batch_id = f.id),0),
         COALESCE((SELECT round(sum(a.quantity - a.dispatched_quantity - a.released_quantity),3)
                     FROM public.v2_sales_allocations a WHERE a.finished_batch_id = f.id AND a.status <> 'released'),0),
         COALESCE((SELECT round(sum(m.quantity),3) FROM public.v2_finished_goods_movements m WHERE m.finished_batch_id = f.id),0)
         - COALESCE((SELECT round(sum(a.quantity - a.dispatched_quantity - a.released_quantity),3)
                     FROM public.v2_sales_allocations a WHERE a.finished_batch_id = f.id AND a.status <> 'released'),0)
  FROM public.v2_finished_product_batches f
  LEFT JOIN public.v2_processed_products p ON p.id = f.product_id
  WHERE f.organization_id = _organization_id
    AND (_facility_id IS NULL OR f.facility_id = _facility_id)
    AND (public.v2_is_org_member(_organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()))
  ORDER BY f.production_date DESC, f.batch_reference
$$;

-- ================================================================= write RPCs
CREATE OR REPLACE FUNCTION public.v2_create_sales_order(
  _organization_id uuid, _customer_id uuid, _lines jsonb,
  _facility_id uuid DEFAULT NULL, _order_date date DEFAULT NULL,
  _requested_delivery_date date DEFAULT NULL, _currency text DEFAULT 'XOF', _notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _order_id uuid; _ref text; _l jsonb;
BEGIN
  IF NOT (public.v2_is_org_member(_organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid())) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  IF _lines IS NULL OR jsonb_array_length(_lines) = 0 THEN RAISE EXCEPTION 'NO_LINES'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.v2_customers WHERE id = _customer_id AND organization_id = _organization_id) THEN
    RAISE EXCEPTION 'CUSTOMER_NOT_FOUND';
  END IF;
  _ref := public.v2_next_ref(_organization_id, 'SO', 'public.v2_sales_orders'::regclass, 'sales_reference');
  INSERT INTO public.v2_sales_orders (organization_id, facility_id, customer_id, sales_reference, order_date,
      requested_delivery_date, currency, commercial_notes, created_by)
  VALUES (_organization_id, _facility_id, _customer_id, _ref, COALESCE(_order_date, CURRENT_DATE),
      _requested_delivery_date, COALESCE(_currency,'XOF'), _notes, auth.uid())
  RETURNING id INTO _order_id;

  FOR _l IN SELECT * FROM jsonb_array_elements(_lines) LOOP
    IF COALESCE((_l->>'quantity')::numeric,0) <= 0 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
    INSERT INTO public.v2_sales_order_lines (sales_order_id, organization_id, product_id, quantity, unit_code, unit_price, discount_amount, notes)
    VALUES (_order_id, _organization_id, (_l->>'product_id')::uuid, (_l->>'quantity')::numeric,
            _l->>'unit_code', (_l->>'unit_price')::numeric, COALESCE((_l->>'discount_amount')::numeric,0), _l->>'notes');
  END LOOP;

  RETURN (SELECT to_jsonb(o) FROM public.v2_sales_orders o WHERE o.id = _order_id);
END $$;

-- Atomic reservation. Locks each finished lot, recomputes availability inside the
-- transaction and refuses the whole confirmation if any lot is short.
CREATE OR REPLACE FUNCTION public.v2_confirm_sales_order(_sales_order_id uuid, _allocations jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o public.v2_sales_orders%ROWTYPE; _a jsonb; _line public.v2_sales_order_lines%ROWTYPE;
        _batch public.v2_finished_product_batches%ROWTYPE; _phys numeric; _res numeric; _avail numeric; _qty numeric;
        _remaining numeric; _b record;
BEGIN
  SELECT * INTO _o FROM public.v2_sales_orders WHERE id = _sales_order_id FOR UPDATE;
  IF _o.id IS NULL THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  IF NOT (public.v2_is_org_member(_o.organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid())) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  IF _o.status <> 'draft' THEN RAISE EXCEPTION 'ORDER_NOT_DRAFT:%', _o.status; END IF;

  -- Build allocations automatically (FEFO) when the caller did not supply any.
  IF _allocations IS NULL OR jsonb_array_length(_allocations) = 0 THEN
    _allocations := '[]'::jsonb;
    FOR _line IN SELECT * FROM public.v2_sales_order_lines WHERE sales_order_id = _sales_order_id LOOP
      _remaining := _line.quantity;
      FOR _b IN
        SELECT f.id,
               COALESCE((SELECT sum(m.quantity) FROM public.v2_finished_goods_movements m WHERE m.finished_batch_id = f.id),0)
               - COALESCE((SELECT sum(a.quantity - a.dispatched_quantity - a.released_quantity)
                           FROM public.v2_sales_allocations a WHERE a.finished_batch_id = f.id AND a.status <> 'released'),0) AS avail
        FROM public.v2_finished_product_batches f
        WHERE f.organization_id = _o.organization_id AND f.product_id = _line.product_id AND f.unit_code = _line.unit_code
        ORDER BY f.expiry_date NULLS LAST, f.production_date
      LOOP
        EXIT WHEN _remaining <= 0;
        IF _b.avail > 0 THEN
          _qty := LEAST(_b.avail, _remaining);
          _allocations := _allocations || jsonb_build_array(jsonb_build_object(
            'sales_order_line_id', _line.id, 'finished_batch_id', _b.id, 'quantity', _qty));
          _remaining := _remaining - _qty;
        END IF;
      END LOOP;
      IF _remaining > 0 THEN
        RAISE EXCEPTION 'INSUFFICIENT_FINISHED_STOCK:%:%:%', _line.id, round(_line.quantity - _remaining,3), round(_line.quantity,3);
      END IF;
    END LOOP;
  END IF;

  FOR _a IN SELECT * FROM jsonb_array_elements(_allocations) LOOP
    SELECT * INTO _line FROM public.v2_sales_order_lines WHERE id = (_a->>'sales_order_line_id')::uuid AND sales_order_id = _sales_order_id;
    IF _line.id IS NULL THEN RAISE EXCEPTION 'LINE_NOT_FOUND'; END IF;
    _qty := (_a->>'quantity')::numeric;
    IF _qty IS NULL OR _qty <= 0 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;

    -- serialise concurrent confirmations on the same lot
    SELECT * INTO _batch FROM public.v2_finished_product_batches
      WHERE id = (_a->>'finished_batch_id')::uuid AND organization_id = _o.organization_id FOR UPDATE;
    IF _batch.id IS NULL THEN RAISE EXCEPTION 'FINISHED_BATCH_NOT_FOUND'; END IF;

    SELECT COALESCE(sum(m.quantity),0) INTO _phys FROM public.v2_finished_goods_movements m WHERE m.finished_batch_id = _batch.id;
    SELECT COALESCE(sum(a.quantity - a.dispatched_quantity - a.released_quantity),0) INTO _res
      FROM public.v2_sales_allocations a WHERE a.finished_batch_id = _batch.id AND a.status <> 'released';
    _avail := _phys - _res;
    IF _qty > _avail THEN
      RAISE EXCEPTION 'INSUFFICIENT_FINISHED_STOCK:%:%:%', _batch.batch_reference, round(_avail,3), round(_qty,3);
    END IF;

    INSERT INTO public.v2_sales_allocations (organization_id, sales_order_id, sales_order_line_id, finished_batch_id, quantity, unit_code)
    VALUES (_o.organization_id, _sales_order_id, _line.id, _batch.id, _qty, _batch.unit_code);
  END LOOP;

  UPDATE public.v2_sales_orders SET status = 'confirmed', confirmed_at = now() WHERE id = _sales_order_id;
  RETURN (SELECT to_jsonb(o) FROM public.v2_sales_orders o WHERE o.id = _sales_order_id);
END $$;

CREATE OR REPLACE FUNCTION public.v2_cancel_sales_order(_sales_order_id uuid, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o public.v2_sales_orders%ROWTYPE;
BEGIN
  SELECT * INTO _o FROM public.v2_sales_orders WHERE id = _sales_order_id FOR UPDATE;
  IF _o.id IS NULL THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  IF NOT (public.v2_is_org_member(_o.organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid())) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  IF _o.status IN ('cancelled','fulfilled') THEN RAISE EXCEPTION 'ORDER_NOT_CANCELLABLE:%', _o.status; END IF;

  -- release only what has not been dispatched; dispatched history is preserved
  UPDATE public.v2_sales_allocations
     SET released_quantity = quantity - dispatched_quantity,
         status = CASE WHEN dispatched_quantity > 0 THEN 'dispatched'::public.v2_allocation_status ELSE 'released'::public.v2_allocation_status END
   WHERE sales_order_id = _sales_order_id AND status <> 'released';

  UPDATE public.v2_sales_orders
     SET status = 'cancelled', cancelled_at = now(), cancellation_reason = _reason
   WHERE id = _sales_order_id;
  PERFORM public.v2_recompute_payment_status(_sales_order_id);
  RETURN (SELECT to_jsonb(o) FROM public.v2_sales_orders o WHERE o.id = _sales_order_id);
END $$;

-- Physical finished stock only moves here.
CREATE OR REPLACE FUNCTION public.v2_post_dispatch(
  _sales_order_id uuid, _lines jsonb, _dispatch_date date DEFAULT NULL, _notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o public.v2_sales_orders%ROWTYPE; _d uuid; _ref text; _l jsonb; _alloc public.v2_sales_allocations%ROWTYPE;
        _qty numeric; _phys numeric; _batch public.v2_finished_product_batches%ROWTYPE; _line public.v2_sales_order_lines%ROWTYPE;
        _outstanding numeric;
BEGIN
  SELECT * INTO _o FROM public.v2_sales_orders WHERE id = _sales_order_id FOR UPDATE;
  IF _o.id IS NULL THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  IF NOT (public.v2_is_org_member(_o.organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid())) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  IF _o.status NOT IN ('confirmed','partially_fulfilled') THEN RAISE EXCEPTION 'ORDER_NOT_DISPATCHABLE:%', _o.status; END IF;
  IF _lines IS NULL OR jsonb_array_length(_lines) = 0 THEN RAISE EXCEPTION 'NO_LINES'; END IF;

  _ref := public.v2_next_ref(_o.organization_id, 'DSP', 'public.v2_sales_dispatches'::regclass, 'dispatch_reference');
  INSERT INTO public.v2_sales_dispatches (organization_id, sales_order_id, customer_id, facility_id, dispatch_reference, dispatch_date, notes, created_by)
  VALUES (_o.organization_id, _sales_order_id, _o.customer_id, _o.facility_id, _ref, COALESCE(_dispatch_date, CURRENT_DATE), _notes, auth.uid())
  RETURNING id INTO _d;

  FOR _l IN SELECT * FROM jsonb_array_elements(_lines) LOOP
    _qty := (_l->>'quantity')::numeric;
    IF _qty IS NULL OR _qty <= 0 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
    SELECT * INTO _alloc FROM public.v2_sales_allocations
      WHERE id = (_l->>'allocation_id')::uuid AND sales_order_id = _sales_order_id FOR UPDATE;
    IF _alloc.id IS NULL THEN RAISE EXCEPTION 'ALLOCATION_NOT_FOUND'; END IF;
    IF _qty > _alloc.quantity - _alloc.dispatched_quantity - _alloc.released_quantity THEN
      RAISE EXCEPTION 'EXCEEDS_RESERVATION:%:%', _alloc.id, round(_alloc.quantity - _alloc.dispatched_quantity - _alloc.released_quantity,3);
    END IF;

    SELECT * INTO _batch FROM public.v2_finished_product_batches WHERE id = _alloc.finished_batch_id FOR UPDATE;
    SELECT COALESCE(sum(m.quantity),0) INTO _phys FROM public.v2_finished_goods_movements m WHERE m.finished_batch_id = _batch.id;
    IF _qty > _phys THEN
      RAISE EXCEPTION 'INSUFFICIENT_FINISHED_STOCK:%:%:%', _batch.batch_reference, round(_phys,3), round(_qty,3);
    END IF;

    INSERT INTO public.v2_sales_dispatch_lines (dispatch_id, organization_id, sales_order_line_id, allocation_id, finished_batch_id, quantity, unit_code)
    VALUES (_d, _o.organization_id, _alloc.sales_order_line_id, _alloc.id, _batch.id, _qty, _alloc.unit_code);

    INSERT INTO public.v2_finished_goods_movements (organization_id, facility_id, finished_batch_id, product_id, movement_type, quantity, unit_code, reference_type, reference_id, notes, created_by)
    VALUES (_o.organization_id, _batch.facility_id, _batch.id, _batch.product_id, 'sale_dispatch', -_qty, _alloc.unit_code, 'sales_dispatch', _d, _ref, auth.uid());

    UPDATE public.v2_sales_allocations
       SET dispatched_quantity = dispatched_quantity + _qty,
           status = CASE WHEN dispatched_quantity + _qty + released_quantity >= quantity THEN 'dispatched'::public.v2_allocation_status
                         ELSE 'partially_dispatched'::public.v2_allocation_status END
     WHERE id = _alloc.id;

    UPDATE public.v2_sales_order_lines SET dispatched_quantity = dispatched_quantity + _qty WHERE id = _alloc.sales_order_line_id;
  END LOOP;

  SELECT COALESCE(sum(quantity - dispatched_quantity),0) INTO _outstanding FROM public.v2_sales_order_lines WHERE sales_order_id = _sales_order_id;
  UPDATE public.v2_sales_orders
     SET status = CASE WHEN _outstanding <= 0 THEN 'fulfilled'::public.v2_sales_status ELSE 'partially_fulfilled'::public.v2_sales_status END,
         fulfilled_at = CASE WHEN _outstanding <= 0 THEN now() ELSE NULL END
   WHERE id = _sales_order_id;

  RETURN jsonb_build_object('dispatch_id', _d, 'dispatch_reference', _ref, 'outstanding_quantity', round(_outstanding,3));
END $$;

CREATE OR REPLACE FUNCTION public.v2_reverse_dispatch(_dispatch_id uuid, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _d public.v2_sales_dispatches%ROWTYPE; _l record; _outstanding numeric; _o public.v2_sales_orders%ROWTYPE;
BEGIN
  SELECT * INTO _d FROM public.v2_sales_dispatches WHERE id = _dispatch_id FOR UPDATE;
  IF _d.id IS NULL THEN RAISE EXCEPTION 'DISPATCH_NOT_FOUND'; END IF;
  IF NOT (public.v2_is_org_member(_d.organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid())) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  IF _d.status = 'reversed' THEN RAISE EXCEPTION 'ALREADY_REVERSED'; END IF;
  SELECT * INTO _o FROM public.v2_sales_orders WHERE id = _d.sales_order_id FOR UPDATE;

  FOR _l IN SELECT * FROM public.v2_sales_dispatch_lines WHERE dispatch_id = _dispatch_id LOOP
    INSERT INTO public.v2_finished_goods_movements (organization_id, facility_id, finished_batch_id, product_id, movement_type, quantity, unit_code, reference_type, reference_id, notes, created_by)
    SELECT _d.organization_id, f.facility_id, f.id, f.product_id, 'dispatch_reversal', _l.quantity, _l.unit_code, 'sales_dispatch_reversal', _dispatch_id, _reason, auth.uid()
    FROM public.v2_finished_product_batches f WHERE f.id = _l.finished_batch_id;

    IF _l.allocation_id IS NOT NULL THEN
      UPDATE public.v2_sales_allocations
         SET dispatched_quantity = GREATEST(dispatched_quantity - _l.quantity, 0),
             released_quantity = CASE WHEN _o.status = 'cancelled' THEN LEAST(released_quantity + _l.quantity, quantity) ELSE released_quantity END,
             status = CASE WHEN _o.status = 'cancelled' THEN 'released'::public.v2_allocation_status
                           WHEN dispatched_quantity - _l.quantity <= 0 THEN 'reserved'::public.v2_allocation_status
                           ELSE 'partially_dispatched'::public.v2_allocation_status END
       WHERE id = _l.allocation_id;
    END IF;

    UPDATE public.v2_sales_order_lines SET dispatched_quantity = GREATEST(dispatched_quantity - _l.quantity, 0) WHERE id = _l.sales_order_line_id;
  END LOOP;

  UPDATE public.v2_sales_dispatches SET status = 'reversed', reversed_at = now(), reversed_by = auth.uid(), reversal_reason = _reason WHERE id = _dispatch_id;

  IF _o.status <> 'cancelled' THEN
    SELECT COALESCE(sum(quantity - dispatched_quantity),0) INTO _outstanding FROM public.v2_sales_order_lines WHERE sales_order_id = _d.sales_order_id;
    UPDATE public.v2_sales_orders
       SET status = CASE WHEN _outstanding <= 0 THEN 'fulfilled'::public.v2_sales_status
                         WHEN EXISTS (SELECT 1 FROM public.v2_sales_order_lines WHERE sales_order_id = _d.sales_order_id AND dispatched_quantity > 0)
                              THEN 'partially_fulfilled'::public.v2_sales_status
                         ELSE 'confirmed'::public.v2_sales_status END,
           fulfilled_at = CASE WHEN _outstanding <= 0 THEN fulfilled_at ELSE NULL END
     WHERE id = _d.sales_order_id;
  END IF;

  RETURN jsonb_build_object('dispatch_id', _dispatch_id, 'status', 'reversed');
END $$;

CREATE OR REPLACE FUNCTION public.v2_record_customer_payment(
  _sales_order_id uuid, _amount numeric, _payment_method public.v2_payment_method DEFAULT 'cash',
  _payment_date date DEFAULT NULL, _reference text DEFAULT NULL, _notes text DEFAULT NULL,
  _cash_account_id uuid DEFAULT NULL, _document_path text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o public.v2_sales_orders%ROWTYPE; _id uuid;
BEGIN
  SELECT * INTO _o FROM public.v2_sales_orders WHERE id = _sales_order_id FOR UPDATE;
  IF _o.id IS NULL THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  IF NOT (public.v2_is_org_member(_o.organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid())) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  IF _o.status = 'cancelled' THEN RAISE EXCEPTION 'ORDER_CANCELLED'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;

  INSERT INTO public.v2_customer_payments (organization_id, customer_id, sales_order_id, payment_reference, payment_date,
      amount, currency, payment_method, cash_account_id, document_path, notes, created_by)
  VALUES (_o.organization_id, _o.customer_id, _sales_order_id, _reference, COALESCE(_payment_date, CURRENT_DATE),
      _amount, _o.currency, _payment_method, _cash_account_id, _document_path, _notes, auth.uid())
  RETURNING id INTO _id;

  RETURN (SELECT jsonb_build_object('payment_id', _id, 'paid_amount', o.paid_amount,
                 'outstanding', round(o.total_amount - o.paid_amount,2), 'payment_status', o.payment_status)
          FROM public.v2_sales_orders o WHERE o.id = _sales_order_id);
END $$;

CREATE OR REPLACE FUNCTION public.v2_reverse_customer_payment(_payment_id uuid, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _p public.v2_customer_payments%ROWTYPE; _id uuid;
BEGIN
  SELECT * INTO _p FROM public.v2_customer_payments WHERE id = _payment_id FOR UPDATE;
  IF _p.id IS NULL THEN RAISE EXCEPTION 'PAYMENT_NOT_FOUND'; END IF;
  IF NOT (public.v2_is_org_member(_p.organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid())) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  IF _p.is_reversal THEN RAISE EXCEPTION 'CANNOT_REVERSE_REVERSAL'; END IF;
  IF _p.reversed_at IS NOT NULL THEN RAISE EXCEPTION 'ALREADY_REVERSED'; END IF;

  INSERT INTO public.v2_customer_payments (organization_id, customer_id, sales_order_id, payment_reference, payment_date,
      amount, currency, payment_method, cash_account_id, is_reversal, reverses_payment_id, reversal_reason, notes, created_by)
  VALUES (_p.organization_id, _p.customer_id, _p.sales_order_id, _p.payment_reference, CURRENT_DATE,
      _p.amount, _p.currency, _p.payment_method, _p.cash_account_id, true, _p.id, _reason, _reason, auth.uid())
  RETURNING id INTO _id;

  UPDATE public.v2_customer_payments SET reversed_at = now(), reversal_reason = _reason WHERE id = _p.id;
  RETURN jsonb_build_object('reversal_payment_id', _id);
END $$;

-- ================================================================= analytics
-- Direct raw-material cost of a finished lot, from actual procurement prices only.
CREATE OR REPLACE FUNCTION public.v2_finished_batch_direct_cost(_finished_batch_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _f public.v2_finished_product_batches%ROWTYPE; _pb uuid; _total_in numeric; _fg_share numeric;
        _cost numeric := 0; _known numeric := 0; _unknown numeric := 0; _cur text; _r record; _lines jsonb := '[]'::jsonb;
BEGIN
  SELECT * INTO _f FROM public.v2_finished_product_batches WHERE id = _finished_batch_id;
  IF _f.id IS NULL THEN RAISE EXCEPTION 'FINISHED_BATCH_NOT_FOUND'; END IF;
  IF NOT (public.v2_is_org_member(_f.organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid())) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  _pb := _f.production_batch_id;
  SELECT COALESCE(sum(quantity),0) INTO _total_in FROM public.v2_production_outputs
    WHERE production_batch_id = _pb AND output_type = 'finished_product' AND unit_code = _f.unit_code;
  _fg_share := CASE WHEN _total_in > 0 THEN _f.quantity_produced / _total_in ELSE 1 END;

  FOR _r IN
    SELECT i.quantity_tonnes, b.batch_reference,
           (SELECT round(sum(pl.line_amount) / NULLIF(sum(pl.ordered_tonnes),0), 4)
              FROM public.v2_procurement_order_lines pl
             WHERE pl.order_id = b.order_id AND pl.crop_id = b.crop_id
               AND (pl.variety_id IS NOT DISTINCT FROM b.variety_id OR pl.variety_id IS NULL)) AS cost_per_tonne,
           (SELECT o.currency FROM public.v2_procurement_orders o WHERE o.id = b.order_id) AS currency
    FROM public.v2_production_inputs i
    JOIN public.v2_raw_material_batches b ON b.id = i.raw_material_batch_id
    WHERE i.production_batch_id = _pb
  LOOP
    IF _r.cost_per_tonne IS NOT NULL THEN
      _cost := _cost + _r.quantity_tonnes * _r.cost_per_tonne;
      _known := _known + _r.quantity_tonnes;
      _cur := COALESCE(_cur, _r.currency);
    ELSE
      _unknown := _unknown + _r.quantity_tonnes;
    END IF;
    _lines := _lines || jsonb_build_array(jsonb_build_object(
      'raw_batch_reference', _r.batch_reference, 'quantity_tonnes', round(_r.quantity_tonnes,3),
      'cost_per_tonne', _r.cost_per_tonne, 'currency', _r.currency));
  END LOOP;

  RETURN jsonb_build_object(
    'finished_batch_id', _f.id, 'batch_reference', _f.batch_reference,
    'quantity_produced', _f.quantity_produced, 'unit_code', _f.unit_code,
    'currency', COALESCE(_cur, 'XOF'),
    'direct_material_cost', round(_cost * _fg_share, 2),
    'cost_per_output_unit', CASE WHEN _f.quantity_produced > 0 THEN round(_cost * _fg_share / _f.quantity_produced, 4) END,
    'priced_tonnes', round(_known,3), 'unpriced_tonnes', round(_unknown,3),
    'complete', _unknown = 0 AND _known > 0,
    'inputs', _lines);
END $$;

-- Recall readiness: where did this finished lot go?
CREATE OR REPLACE FUNCTION public.v2_trace_finished_batch_customers(_finished_batch_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _f public.v2_finished_product_batches%ROWTYPE; _rows jsonb; _phys numeric; _res numeric;
BEGIN
  SELECT * INTO _f FROM public.v2_finished_product_batches WHERE id = _finished_batch_id;
  IF _f.id IS NULL THEN RAISE EXCEPTION 'FINISHED_BATCH_NOT_FOUND'; END IF;
  IF NOT (public.v2_is_org_member(_f.organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid())) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'dispatch_date'), '[]'::jsonb) INTO _rows FROM (
    SELECT jsonb_build_object(
      'customer_id', c.id, 'customer_name', c.display_name, 'customer_type', c.customer_type,
      'sales_reference', so.sales_reference, 'sales_order_id', so.id,
      'dispatch_reference', d.dispatch_reference, 'dispatch_id', d.id,
      'dispatch_date', d.dispatch_date, 'dispatch_status', d.status,
      'quantity', dl.quantity, 'unit_code', dl.unit_code) AS x
    FROM public.v2_sales_dispatch_lines dl
    JOIN public.v2_sales_dispatches d ON d.id = dl.dispatch_id
    JOIN public.v2_sales_orders so ON so.id = d.sales_order_id
    JOIN public.v2_customers c ON c.id = d.customer_id
    WHERE dl.finished_batch_id = _finished_batch_id
  ) s;

  SELECT COALESCE(sum(m.quantity),0) INTO _phys FROM public.v2_finished_goods_movements m WHERE m.finished_batch_id = _f.id;
  SELECT COALESCE(sum(a.quantity - a.dispatched_quantity - a.released_quantity),0) INTO _res
    FROM public.v2_sales_allocations a WHERE a.finished_batch_id = _f.id AND a.status <> 'released';

  RETURN jsonb_build_object(
    'finished_batch', jsonb_build_object('id', _f.id, 'reference', _f.batch_reference,
        'quantity_produced', _f.quantity_produced, 'unit_code', _f.unit_code),
    'remaining_physical', round(_phys,3), 'reserved', round(_res,3), 'available', round(_phys - _res,3),
    'destinations', _rows);
END $$;

-- Business performance for a period. Every figure is derived from source records.
CREATE OR REPLACE FUNCTION public.v2_business_performance(_organization_id uuid, _from date, _to date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _r jsonb;
BEGIN
  IF NOT (public.v2_is_org_member(_organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid())) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  SELECT jsonb_build_object(
    'from', _from, 'to', _to, 'currency', 'XOF',
    'sales_recorded', COALESCE((SELECT round(sum(total_amount),2) FROM public.v2_sales_orders
        WHERE organization_id = _organization_id AND status <> 'cancelled' AND order_date BETWEEN _from AND _to),0),
    'sales_count', (SELECT count(*) FROM public.v2_sales_orders
        WHERE organization_id = _organization_id AND status <> 'cancelled' AND order_date BETWEEN _from AND _to),
    'cash_collected', COALESCE((SELECT round(sum(CASE WHEN is_reversal THEN -amount ELSE amount END),2)
        FROM public.v2_customer_payments WHERE organization_id = _organization_id AND payment_date BETWEEN _from AND _to),0),
    'outstanding_receivables', COALESCE((SELECT round(sum(total_amount - paid_amount),2) FROM public.v2_sales_orders
        WHERE organization_id = _organization_id AND status <> 'cancelled' AND total_amount > paid_amount),0),
    'procurement_spend', COALESCE((SELECT round(sum(total_expected_amount),2) FROM public.v2_procurement_orders
        WHERE organization_id = _organization_id AND status <> 'cancelled' AND created_at::date BETWEEN _from AND _to),0),
    'other_operating_expenses', COALESCE((SELECT round(sum(amount),2) FROM public.v2_expenses
        WHERE organization_id = _organization_id AND category <> 'raw_materials' AND expense_date BETWEEN _from AND _to),0),
    'expenses_paid', COALESCE((SELECT round(sum(amount),2) FROM public.v2_expenses
        WHERE organization_id = _organization_id AND payment_status = 'paid' AND COALESCE(payment_date, expense_date) BETWEEN _from AND _to),0),
    'finished_goods_sold', COALESCE((SELECT jsonb_agg(jsonb_build_object('unit_code', unit_code, 'quantity', qty)) FROM (
        SELECT dl.unit_code, round(sum(dl.quantity),3) AS qty FROM public.v2_sales_dispatch_lines dl
        JOIN public.v2_sales_dispatches d ON d.id = dl.dispatch_id
        WHERE d.organization_id = _organization_id AND d.status = 'posted' AND d.dispatch_date BETWEEN _from AND _to
        GROUP BY dl.unit_code) s), '[]'::jsonb),
    'production_volume', COALESCE((SELECT jsonb_agg(jsonb_build_object('unit_code', unit_code, 'quantity', qty)) FROM (
        SELECT o.unit_code, round(sum(o.quantity),3) AS qty FROM public.v2_production_outputs o
        JOIN public.v2_production_batches b ON b.id = o.production_batch_id
        WHERE b.organization_id = _organization_id AND b.status = 'completed'
          AND o.output_type = 'finished_product' AND b.production_date BETWEEN _from AND _to
        GROUP BY o.unit_code) s), '[]'::jsonb),
    'raw_material_consumed_tonnes', COALESCE((SELECT round(-sum(m.quantity_tonnes),3) FROM public.v2_inventory_movements m
        WHERE m.organization_id = _organization_id AND m.movement_type = 'production_consumption'
          AND m.created_at::date BETWEEN _from AND _to),0),
    'raw_material_inventory_tonnes', COALESCE((SELECT round(sum(current_tonnes),3) FROM public.v2_raw_material_batches
        WHERE organization_id = _organization_id),0),
    'finished_goods_inventory', COALESCE((SELECT jsonb_agg(jsonb_build_object('unit_code', unit_code, 'quantity', qty)) FROM (
        SELECT f.unit_code, round(sum(m.quantity),3) AS qty FROM public.v2_finished_goods_movements m
        JOIN public.v2_finished_product_batches f ON f.id = m.finished_batch_id
        WHERE m.organization_id = _organization_id GROUP BY f.unit_code HAVING round(sum(m.quantity),3) <> 0) s), '[]'::jsonb),
    'cash_in', COALESCE((SELECT round(sum(amount),2) FROM public.v2_cash_movements
        WHERE organization_id = _organization_id AND amount > 0 AND movement_date BETWEEN _from AND _to),0),
    'cash_out', COALESCE((SELECT round(-sum(amount),2) FROM public.v2_cash_movements
        WHERE organization_id = _organization_id AND amount < 0 AND movement_date BETWEEN _from AND _to),0),
    'cash_accounts_configured', (SELECT count(*) FROM public.v2_cash_accounts
        WHERE organization_id = _organization_id AND is_active AND opening_balance IS NOT NULL)
  ) INTO _r;
  RETURN _r;
END $$;

CREATE OR REPLACE FUNCTION public.v2_business_trend(_organization_id uuid, _months integer DEFAULT 6)
RETURNS TABLE (month date, sales_value numeric, cash_collected numeric, procurement_spend numeric, other_expenses numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH m AS (
    SELECT generate_series(date_trunc('month', CURRENT_DATE) - ((_months - 1) || ' months')::interval,
                           date_trunc('month', CURRENT_DATE), '1 month')::date AS month
  )
  SELECT m.month,
    COALESCE((SELECT round(sum(o.total_amount),2) FROM public.v2_sales_orders o
      WHERE o.organization_id = _organization_id AND o.status <> 'cancelled'
        AND date_trunc('month', o.order_date)::date = m.month),0),
    COALESCE((SELECT round(sum(CASE WHEN p.is_reversal THEN -p.amount ELSE p.amount END),2) FROM public.v2_customer_payments p
      WHERE p.organization_id = _organization_id AND date_trunc('month', p.payment_date)::date = m.month),0),
    COALESCE((SELECT round(sum(po.total_expected_amount),2) FROM public.v2_procurement_orders po
      WHERE po.organization_id = _organization_id AND po.status <> 'cancelled'
        AND date_trunc('month', po.created_at)::date = m.month),0),
    COALESCE((SELECT round(sum(e.amount),2) FROM public.v2_expenses e
      WHERE e.organization_id = _organization_id AND e.category <> 'raw_materials'
        AND date_trunc('month', e.expense_date)::date = m.month),0)
  FROM m
  WHERE public.v2_is_org_member(_organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid())
  ORDER BY m.month
$$;

CREATE OR REPLACE FUNCTION public.v2_expense_breakdown(_organization_id uuid, _from date, _to date)
RETURNS TABLE (category public.v2_expense_category, total numeric, paid numeric, entries integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.category, round(sum(e.amount),2),
         round(sum(CASE WHEN e.payment_status = 'paid' THEN e.amount ELSE 0 END),2), count(*)::int
  FROM public.v2_expenses e
  WHERE e.organization_id = _organization_id AND e.expense_date BETWEEN _from AND _to
    AND (public.v2_is_org_member(_organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid()))
  GROUP BY e.category ORDER BY 2 DESC
$$;

-- Operational data completeness (NOT a credit score).
CREATE OR REPLACE FUNCTION public.v2_business_completeness(_organization_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _sales int; _dispatched int; _paid_tracked int; _expenses int; _months int; _fg int; _fg_traced int;
BEGIN
  IF NOT (public.v2_is_org_member(_organization_id, auth.uid()) OR public.v2_is_agrigrid_admin(auth.uid())) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  SELECT count(*) INTO _sales FROM public.v2_sales_orders WHERE organization_id = _organization_id AND status <> 'draft';
  SELECT count(*) INTO _dispatched FROM public.v2_sales_orders WHERE organization_id = _organization_id AND status IN ('partially_fulfilled','fulfilled');
  SELECT count(*) INTO _paid_tracked FROM public.v2_sales_orders WHERE organization_id = _organization_id AND status <> 'draft' AND paid_amount > 0;
  SELECT count(*) INTO _expenses FROM public.v2_expenses WHERE organization_id = _organization_id AND expense_date >= CURRENT_DATE - 90;
  SELECT count(DISTINCT date_trunc('month', expense_date)) INTO _months FROM public.v2_expenses
    WHERE organization_id = _organization_id AND expense_date >= CURRENT_DATE - 90;
  SELECT count(*) INTO _fg FROM public.v2_finished_product_batches WHERE organization_id = _organization_id;
  SELECT count(*) INTO _fg_traced FROM public.v2_finished_product_batches f
    WHERE f.organization_id = _organization_id AND f.production_batch_id IS NOT NULL;

  RETURN jsonb_build_object(
    'sales_tracking', CASE WHEN _sales = 0 THEN 0 ELSE round(100.0 * _dispatched / _sales) END,
    'payment_tracking', CASE WHEN _sales = 0 THEN 0 ELSE round(100.0 * _paid_tracked / _sales) END,
    'expense_tracking', LEAST(100, round(100.0 * COALESCE(_months,0) / 3)),
    'inventory_tracking', CASE WHEN _fg = 0 THEN 0 ELSE round(100.0 * _fg_traced / _fg) END,
    'sales_orders', _sales, 'expense_entries', _expenses, 'finished_batches', _fg);
END $$;

REVOKE ALL ON FUNCTION public.v2_next_ref(uuid, text, regclass, text) FROM public, anon;
