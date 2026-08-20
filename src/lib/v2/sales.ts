// AGRI-GRID V2 — Phase 2B: customers, sales, dispatch, payments, expenses,
// operational cash and business performance.
//
// ARCHITECTURE / BUSINESS RULES (mirrored in the database, never in the browser)
// -----------------------------------------------------------------------------
// * PHYSICAL finished stock only moves through v2_finished_goods_movements.
//   A sale, a confirmation or a reservation never changes physical stock.
//   Only a posted dispatch writes a negative `sale_dispatch` movement, and a
//   reversal writes a compensating positive `dispatch_reversal` movement.
// * RESERVED stock = sum of active allocations (quantity - dispatched - released).
//   AVAILABLE-TO-SELL = physical - reserved.
// * Confirming a sales order runs inside v2_confirm_sales_order, which takes a
//   row lock on every finished lot it touches before recomputing availability.
//   Two concurrent confirmations of the same lot can never oversell: the second
//   one fails with INSUFFICIENT_FINISHED_STOCK:<lot>:<available>:<requested>.
// * OVERPAYMENT IS BLOCKED (documented Phase 2B model). A payment that would
//   push paid_amount above the sale total raises OVERPAYMENT_BLOCKED:<outstanding>.
//   Payments are never edited or deleted; a reversal creates a negative record.
// * Sales value (revenue recorded) and cash collected are two different figures
//   and are never merged in the UI.
// * Raw-material purchases captured through procurement are NOT re-entered as
//   expenses; "other operating expenses" excludes the raw_materials category.
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import type { StatusTone } from "@/components/v2/ui-kit/StatusBadge";

type Tables = Database["public"]["Tables"];
type Enums = Database["public"]["Enums"];
type Fn = Database["public"]["Functions"];

export type Customer = Tables["v2_customers"]["Row"];
export type SalesOrder = Tables["v2_sales_orders"]["Row"];
export type SalesOrderLine = Tables["v2_sales_order_lines"]["Row"];
export type SalesAllocation = Tables["v2_sales_allocations"]["Row"];
export type SalesDispatch = Tables["v2_sales_dispatches"]["Row"];
export type SalesDispatchLine = Tables["v2_sales_dispatch_lines"]["Row"];
export type CustomerPayment = Tables["v2_customer_payments"]["Row"];
export type Expense = Tables["v2_expenses"]["Row"];
export type CashMovement = Tables["v2_cash_movements"]["Row"];
export type CashAccount = Tables["v2_cash_accounts"]["Row"];
export type FinishedAvailabilityRow = Fn["v2_finished_goods_availability"]["Returns"][number];
export type BusinessTrendRow = Fn["v2_business_trend"]["Returns"][number];
export type ExpenseBreakdownRow = Fn["v2_expense_breakdown"]["Returns"][number];

export type CustomerType = Enums["v2_customer_type"];
export type SalesStatus = Enums["v2_sales_status"];
export type SalesPaymentStatus = Enums["v2_sales_payment_status"];
export type PaymentMethod = Enums["v2_payment_method"];
export type ExpenseCategory = Enums["v2_expense_category"];

export const CUSTOMER_TYPES: CustomerType[] = [
  "individual",
  "retailer",
  "wholesaler",
  "distributor",
  "supermarket",
  "restaurant_hotel",
  "exporter",
  "institution",
  "other",
];

export const PAYMENT_METHODS: PaymentMethod[] = ["cash", "bank_transfer", "mobile_money", "cheque", "other"];

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "raw_materials",
  "packaging",
  "transport",
  "labor",
  "electricity",
  "water",
  "rent",
  "maintenance",
  "certification",
  "marketing",
  "administration",
  "taxes_and_fees",
  "other",
];

export const SALES_TONE: Record<string, StatusTone> = {
  draft: "neutral",
  confirmed: "info",
  partially_fulfilled: "warning",
  fulfilled: "success",
  cancelled: "danger",
};

export const PAYMENT_TONE: Record<string, StatusTone> = {
  unpaid: "danger",
  partially_paid: "warning",
  paid: "success",
  cancelled: "neutral",
};

const SALES_ERROR_CODES = [
  "INSUFFICIENT_FINISHED_STOCK",
  "OVERPAYMENT_BLOCKED",
  "EXCEEDS_RESERVATION",
  "ORDER_NOT_DRAFT",
  "ORDER_NOT_DISPATCHABLE",
  "ORDER_NOT_CANCELLABLE",
  "ORDER_NOT_FOUND",
  "ORDER_CANCELLED",
  "ALLOCATION_NOT_FOUND",
  "FINISHED_BATCH_NOT_FOUND",
  "CUSTOMER_NOT_FOUND",
  "PAYMENT_NOT_FOUND",
  "ALREADY_REVERSED",
  "CANNOT_REVERSE_REVERSAL",
  "INVALID_QUANTITY",
  "INVALID_AMOUNT",
  "NO_LINES",
  "LINE_NOT_FOUND",
  "NOT_AUTHORIZED",
];

/** Turns a Postgres exception raised by the Phase 2B RPCs into a translatable code. */
export function parseSalesError(message: string): { code: string; value?: string; raw: string } {
  for (const code of SALES_ERROR_CODES) {
    const at = message.indexOf(code);
    if (at >= 0) {
      const m = message.slice(at + code.length).match(/^:([^\s"]+(?::[^\s"]+)*)/);
      return { code, value: m?.[1], raw: message };
    }
  }
  return { code: "UNKNOWN", raw: message };
}

/** Deterministic line total — identical formula to the generated database column. */
export function lineTotal(quantity: number, unitPrice: number, discount = 0): number {
  return Math.round((quantity * unitPrice - discount) * 100) / 100;
}

export function formatMoney(amount: number | null | undefined, currency = "XOF", locale = "fr-FR"): string {
  return `${Number(amount ?? 0).toLocaleString(locale, { maximumFractionDigits: 2 })} ${currency}`;
}

/* ================================= customers ================================ */

export async function fetchCustomers(organizationId: string): Promise<Customer[]> {
  const { data, error } = await supabase
    .from("v2_customers")
    .select("*")
    .eq("organization_id", organizationId)
    .order("display_name");
  if (error) throw error;
  return data ?? [];
}

export async function createCustomer(input: Tables["v2_customers"]["Insert"]): Promise<Customer> {
  const { data, error } = await supabase.from("v2_customers").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateCustomer(id: string, patch: Tables["v2_customers"]["Update"]): Promise<void> {
  const { error } = await supabase.from("v2_customers").update(patch).eq("id", id);
  if (error) throw error;
}

/* =================================== sales ================================== */

export type SalesOrderRow = SalesOrder & {
  customer?: { display_name: string; customer_type: CustomerType } | null;
};

export async function fetchSalesOrders(organizationId: string): Promise<SalesOrderRow[]> {
  const { data, error } = await supabase
    .from("v2_sales_orders")
    .select("*, customer:v2_customers(display_name, customer_type)")
    .eq("organization_id", organizationId)
    .order("order_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as SalesOrderRow[];
}

export type SalesOrderDetail = {
  order: SalesOrderRow & { customer: Customer | null };
  lines: (SalesOrderLine & { product?: { product_name: string } | null })[];
  allocations: (SalesAllocation & { batch?: { batch_reference: string } | null })[];
  dispatches: (SalesDispatch & { lines: SalesDispatchLine[] })[];
  payments: CustomerPayment[];
};

export async function fetchSalesOrderDetail(id: string): Promise<SalesOrderDetail | null> {
  const [o, l, a, d, p] = await Promise.all([
    supabase.from("v2_sales_orders").select("*, customer:v2_customers(*)").eq("id", id).maybeSingle(),
    supabase
      .from("v2_sales_order_lines")
      .select("*, product:v2_processed_products(product_name)")
      .eq("sales_order_id", id)
      .order("created_at"),
    supabase
      .from("v2_sales_allocations")
      .select("*, batch:v2_finished_product_batches(batch_reference)")
      .eq("sales_order_id", id)
      .order("created_at"),
    supabase
      .from("v2_sales_dispatches")
      .select("*, lines:v2_sales_dispatch_lines(*)")
      .eq("sales_order_id", id)
      .order("dispatch_date", { ascending: false }),
    supabase.from("v2_customer_payments").select("*").eq("sales_order_id", id).order("payment_date"),
  ]);
  if (o.error) throw o.error;
  if (!o.data) return null;
  return {
    order: o.data as unknown as SalesOrderDetail["order"],
    lines: (l.data ?? []) as SalesOrderDetail["lines"],
    allocations: (a.data ?? []) as SalesOrderDetail["allocations"],
    dispatches: (d.data ?? []) as unknown as SalesOrderDetail["dispatches"],
    payments: (p.data ?? []) as CustomerPayment[],
  };
}

export type NewSaleLine = {
  product_id: string;
  quantity: number;
  unit_code: string;
  unit_price: number;
  discount_amount?: number;
  notes?: string | null;
};

export async function createSalesOrder(args: {
  organizationId: string;
  customerId: string;
  lines: NewSaleLine[];
  facilityId?: string | null;
  orderDate?: string;
  requestedDeliveryDate?: string | null;
  currency?: string;
  notes?: string | null;
}): Promise<SalesOrder> {
  const { data, error } = await supabase.rpc("v2_create_sales_order", {
    _organization_id: args.organizationId,
    _customer_id: args.customerId,
    _lines: args.lines as unknown as Json,
    _facility_id: args.facilityId ?? undefined,
    _order_date: args.orderDate ?? undefined,
    _requested_delivery_date: args.requestedDeliveryDate ?? undefined,
    _currency: args.currency ?? "XOF",
    _notes: args.notes ?? undefined,
  });
  if (error) throw error;
  return data as unknown as SalesOrder;
}

/** Reserves finished lots atomically. Without explicit allocations the database picks FEFO lots. */
export async function confirmSalesOrder(
  salesOrderId: string,
  allocations?: { sales_order_line_id: string; finished_batch_id: string; quantity: number }[],
): Promise<SalesOrder> {
  const { data, error } = await supabase.rpc("v2_confirm_sales_order", {
    _sales_order_id: salesOrderId,
    _allocations: (allocations ?? null) as unknown as Json,
  });
  if (error) throw error;
  return data as unknown as SalesOrder;
}

export async function cancelSalesOrder(salesOrderId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc("v2_cancel_sales_order", { _sales_order_id: salesOrderId, _reason: reason });
  if (error) throw error;
}

export async function postDispatch(args: {
  salesOrderId: string;
  lines: { allocation_id: string; quantity: number }[];
  dispatchDate?: string;
  notes?: string | null;
}): Promise<{ dispatch_id: string; dispatch_reference: string; outstanding_quantity: number }> {
  const { data, error } = await supabase.rpc("v2_post_dispatch", {
    _sales_order_id: args.salesOrderId,
    _lines: args.lines as unknown as Json,
    _dispatch_date: args.dispatchDate ?? undefined,
    _notes: args.notes ?? undefined,
  });
  if (error) throw error;
  return data as unknown as { dispatch_id: string; dispatch_reference: string; outstanding_quantity: number };
}

export async function reverseDispatch(dispatchId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc("v2_reverse_dispatch", { _dispatch_id: dispatchId, _reason: reason });
  if (error) throw error;
}

/* ================================= payments ================================= */

export async function recordCustomerPayment(args: {
  salesOrderId: string;
  amount: number;
  method?: PaymentMethod;
  paymentDate?: string;
  reference?: string | null;
  notes?: string | null;
  documentPath?: string | null;
}): Promise<{ payment_id: string; paid_amount: number; outstanding: number; payment_status: SalesPaymentStatus }> {
  const { data, error } = await supabase.rpc("v2_record_customer_payment", {
    _sales_order_id: args.salesOrderId,
    _amount: args.amount,
    _payment_method: args.method ?? "cash",
    _payment_date: args.paymentDate ?? undefined,
    _reference: args.reference ?? undefined,
    _notes: args.notes ?? undefined,
    _document_path: args.documentPath ?? undefined,
  });
  if (error) throw error;
  return data as unknown as {
    payment_id: string;
    paid_amount: number;
    outstanding: number;
    payment_status: SalesPaymentStatus;
  };
}

export async function reverseCustomerPayment(paymentId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc("v2_reverse_customer_payment", { _payment_id: paymentId, _reason: reason });
  if (error) throw error;
}

/* ================================= expenses ================================= */

export async function fetchExpenses(organizationId: string, from?: string, to?: string): Promise<Expense[]> {
  let q = supabase.from("v2_expenses").select("*").eq("organization_id", organizationId);
  if (from) q = q.gte("expense_date", from);
  if (to) q = q.lte("expense_date", to);
  const { data, error } = await q.order("expense_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createExpense(input: Tables["v2_expenses"]["Insert"]): Promise<Expense> {
  const { data, error } = await supabase.from("v2_expenses").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateExpense(id: string, patch: Tables["v2_expenses"]["Update"]): Promise<void> {
  const { error } = await supabase.from("v2_expenses").update(patch).eq("id", id);
  if (error) throw error;
}

export async function fetchExpenseBreakdown(organizationId: string, from: string, to: string): Promise<ExpenseBreakdownRow[]> {
  const { data, error } = await supabase.rpc("v2_expense_breakdown", {
    _organization_id: organizationId,
    _from: from,
    _to: to,
  });
  if (error) throw error;
  return data ?? [];
}

/* =============================== stock / cash =============================== */

export async function fetchFinishedAvailability(
  organizationId: string,
  facilityId?: string | null,
): Promise<FinishedAvailabilityRow[]> {
  const { data, error } = await supabase.rpc("v2_finished_goods_availability", {
    _organization_id: organizationId,
    _facility_id: facilityId ?? undefined,
  });
  if (error) throw error;
  return data ?? [];
}

export async function fetchCashMovements(organizationId: string, limit = 60): Promise<CashMovement[]> {
  const { data, error } = await supabase
    .from("v2_cash_movements")
    .select("*")
    .eq("organization_id", organizationId)
    .order("movement_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/* =============================== performance ================================ */

export type BusinessPerformance = {
  from: string;
  to: string;
  currency: string;
  sales_recorded: number;
  sales_count: number;
  cash_collected: number;
  outstanding_receivables: number;
  procurement_spend: number;
  other_operating_expenses: number;
  expenses_paid: number;
  finished_goods_sold: { unit_code: string; quantity: number }[];
  production_volume: { unit_code: string; quantity: number }[];
  raw_material_consumed_tonnes: number;
  raw_material_inventory_tonnes: number;
  finished_goods_inventory: { unit_code: string; quantity: number }[];
  cash_in: number;
  cash_out: number;
  cash_accounts_configured: number;
};

export async function fetchBusinessPerformance(
  organizationId: string,
  from: string,
  to: string,
): Promise<BusinessPerformance> {
  const { data, error } = await supabase.rpc("v2_business_performance", {
    _organization_id: organizationId,
    _from: from,
    _to: to,
  });
  if (error) throw error;
  return data as unknown as BusinessPerformance;
}

export async function fetchBusinessTrend(organizationId: string, months = 6): Promise<BusinessTrendRow[]> {
  const { data, error } = await supabase.rpc("v2_business_trend", { _organization_id: organizationId, _months: months });
  if (error) throw error;
  return data ?? [];
}

export type BusinessCompleteness = {
  sales_tracking: number;
  payment_tracking: number;
  expense_tracking: number;
  inventory_tracking: number;
  sales_orders: number;
  expense_entries: number;
  finished_batches: number;
};

export async function fetchBusinessCompleteness(organizationId: string): Promise<BusinessCompleteness> {
  const { data, error } = await supabase.rpc("v2_business_completeness", { _organization_id: organizationId });
  if (error) throw error;
  return data as unknown as BusinessCompleteness;
}

/* ============================== traceability ================================ */

export type LotDestinations = {
  finished_batch: { id: string; reference: string; quantity_produced: number; unit_code: string };
  remaining_physical: number;
  reserved: number;
  available: number;
  destinations: {
    customer_id: string;
    customer_name: string;
    customer_type: CustomerType;
    sales_reference: string;
    sales_order_id: string;
    dispatch_reference: string;
    dispatch_id: string;
    dispatch_date: string;
    dispatch_status: string;
    quantity: number;
    unit_code: string;
  }[];
};

/** Recall-readiness: "where did FG-2026-000001 go?" */
export async function traceFinishedBatchCustomers(finishedBatchId: string): Promise<LotDestinations> {
  const { data, error } = await supabase.rpc("v2_trace_finished_batch_customers", {
    _finished_batch_id: finishedBatchId,
  });
  if (error) throw error;
  return data as unknown as LotDestinations;
}

export type DirectCost = {
  finished_batch_id: string;
  batch_reference: string;
  quantity_produced: number;
  unit_code: string;
  currency: string;
  direct_material_cost: number;
  cost_per_output_unit: number | null;
  priced_tonnes: number;
  unpriced_tonnes: number;
  complete: boolean;
  inputs: { raw_batch_reference: string; quantity_tonnes: number; cost_per_tonne: number | null; currency: string | null }[];
};

/** Direct raw-material cost only — never "total production cost", never "gross profit". */
export async function fetchDirectCost(finishedBatchId: string): Promise<DirectCost> {
  const { data, error } = await supabase.rpc("v2_finished_batch_direct_cost", { _finished_batch_id: finishedBatchId });
  if (error) throw error;
  return data as unknown as DirectCost;
}

/* ================================= periods ================================== */

export type PeriodKey = "this_month" | "last_month" | "last_3_months" | "custom";

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function resolvePeriod(key: PeriodKey, custom?: { from: string; to: string }): { from: string; to: string } {
  const now = new Date();
  const startOfMonth = (offset: number) => new Date(now.getFullYear(), now.getMonth() + offset, 1);
  switch (key) {
    case "last_month":
      return { from: iso(startOfMonth(-1)), to: iso(new Date(now.getFullYear(), now.getMonth(), 0)) };
    case "last_3_months":
      return { from: iso(startOfMonth(-2)), to: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
    case "custom":
      return custom ?? { from: iso(startOfMonth(0)), to: iso(now) };
    default:
      return { from: iso(startOfMonth(0)), to: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
  }
}
