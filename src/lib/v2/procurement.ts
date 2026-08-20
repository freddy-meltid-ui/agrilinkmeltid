// AGRI-GRID V2 — Phase 1E: commercial confirmation → procurement → delivery →
// goods receipt → raw-material inventory.
//
// ARCHITECTURE
// ------------
// Everything that must be atomic or that carries an authorisation rule lives in
// SECURITY DEFINER RPCs. The browser never computes availability, never writes a
// reservation and never posts inventory:
//
//   v2_propose_commitment          processor asks a named supplier for a quantity
//   v2_confirm_commitment          supplier / field agent / admin answers (ATOMIC)
//   v2_release_commitment          frees a reservation, keeps the history
//   v2_expire_commitments          housekeeping for stale confirmations
//   v2_create_procurement_order    confirmed commitment → order + order line
//   v2_cancel_procurement_order    cancels and releases what was never received
//   v2_receive_goods               receipt + batch + inventory movement (ATOMIC)
//   v2_request_commitments         processor-side read model for one request
//   v2_commercial_confirmation_feed  supplier / agent confirmation queue
//   v2_sourcing_funnel             requested → identified → confirmed → ordered → received
//   v2_inventory_balance           ledger balance per crop/variety
//   v2_supplier_commercial_contact controlled contact disclosure
//
// RESERVATION RULE (mirrors the database, documented once):
//   committed = Σ confirmed tonnes of commitments in
//   confirmed / partially_confirmed / fulfilled
//             + Σ accepted tonnes already received under commitments that are no
//               longer active (released / cancelled / expired after a partial
//               receipt) — delivered volume is consumed, never re-offered.
//   Only those quantities reduce what other processors see. A confirmation is a
//   commercial reservation, NOT a change to the field observation: the physical
//   quantity captured by the field agent is never rewritten by this module.
//
// DOUBLE-ALLOCATION: solved. v2_commercial_supply and v2_sourcing_matches now
// return `quantity_tonnes` net of confirmed commitments, and the confirmation RPC
// locks the supply row, so two processors racing on the same tonnes cannot both win —
// the loser gets INSUFFICIENT_AVAILABILITY with the exact remaining volume.
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { StatusTone } from "@/components/v2/ui-kit/StatusBadge";

type Tables = Database["public"]["Tables"];
type Fn = Database["public"]["Functions"];

export type Commitment = Tables["v2_supply_commitments"]["Row"];
export type CommitmentStatus = Database["public"]["Enums"]["v2_commitment_status"];
export type ProcurementOrder = Tables["v2_procurement_orders"]["Row"];
export type ProcurementOrderLine = Tables["v2_procurement_order_lines"]["Row"];
export type Delivery = Tables["v2_deliveries"]["Row"];
export type DeliveryStatus = Database["public"]["Enums"]["v2_delivery_status"];
export type GoodsReceipt = Tables["v2_goods_receipts"]["Row"];
export type RawMaterialBatch = Tables["v2_raw_material_batches"]["Row"];
export type InventoryMovement = Tables["v2_inventory_movements"]["Row"];
export type NotificationEvent = Tables["v2_notification_events"]["Row"];

export type RequestCommitmentRow = Fn["v2_request_commitments"]["Returns"][number];
export type ConfirmationFeedRow = Fn["v2_commercial_confirmation_feed"]["Returns"][number];
export type FunnelRow = Fn["v2_sourcing_funnel"]["Returns"][number];
export type InventoryBalanceRow = Fn["v2_inventory_balance"]["Returns"][number];
export type ProcurementSummaryRow = Fn["v2_procurement_summary"]["Returns"][number];

/* ------------------------------ presentation ------------------------------ */

export const COMMITMENT_TONE: Record<string, StatusTone> = {
  proposed: "info",
  pending_confirmation: "warning",
  confirmed: "success",
  partially_confirmed: "warning",
  declined: "danger",
  released: "neutral",
  expired: "neutral",
  cancelled: "neutral",
  fulfilled: "success",
};

export const ORDER_TONE: Record<string, StatusTone> = {
  draft: "neutral",
  pending_supplier_confirmation: "warning",
  confirmed: "info",
  ready_for_delivery: "info",
  partially_delivered: "warning",
  delivered: "success",
  cancelled: "neutral",
  expired: "neutral",
};

export const DELIVERY_TONE: Record<string, StatusTone> = {
  scheduled: "info",
  in_transit: "info",
  arrived: "warning",
  received: "success",
  partially_accepted: "warning",
  rejected: "danger",
  cancelled: "neutral",
};

/** Turns a Postgres exception raised by the RPCs into a translatable outcome. */
export type ProcurementFailure = { code: string; value?: string; raw: string };

export function parseProcurementError(message: string): ProcurementFailure {
  const known = [
    "INSUFFICIENT_AVAILABILITY",
    "OVER_DELIVERY_REQUIRES_CONFIRMATION",
    "COMMITMENT_NOT_PENDING",
    "COMMITMENT_NOT_CONFIRMED",
    "COMMITMENT_NOT_FOUND",
    "COMMITMENT_ALREADY_FULFILLED",
    "ORDER_ALREADY_EXISTS",
    "ORDER_ALREADY_DELIVERED",
    "DELIVERY_ALREADY_CLOSED",
    "ACCEPTED_PLUS_REJECTED_EXCEEDS_DELIVERED",
    "NOT_AUTHORIZED_TO_CONFIRM",
    "NOT_AUTHORIZED",
    "SUPPLY_NOT_FOUND",
    "INVALID_QUANTITY",
  ];
  for (const code of known) {
    const at = message.indexOf(code);
    if (at >= 0) {
      const rest = message.slice(at + code.length);
      const m = rest.match(/^:([^\s"]+)/);
      return { code, value: m?.[1], raw: message };
    }
  }
  return { code: "UNKNOWN", raw: message };
}

/* ------------------------------ commitments ------------------------------- */

export async function fetchRequestCommitments(requestId: string): Promise<RequestCommitmentRow[]> {
  const { data, error } = await supabase.rpc("v2_request_commitments", { _request_id: requestId });
  if (error) throw error;
  return data ?? [];
}

export async function proposeCommitment(input: {
  requestId: string;
  supplyId: string;
  quantity: number;
  unitCode: string;
  start?: string | null;
  end?: string | null;
  targetPrice?: number | null;
  notes?: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc("v2_propose_commitment", {
    _request_id: input.requestId,
    _supply_id: input.supplyId,
    _quantity: input.quantity,
    _unit_code: input.unitCode,
    _start: input.start ?? null,
    _end: input.end ?? null,
    _target_price: input.targetPrice ?? null,
    _notes: input.notes ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function answerCommitment(input: {
  commitmentId: string;
  accepted: boolean;
  quantity?: number | null;
  unitCode?: string | null;
  start?: string | null;
  end?: string | null;
  unitPrice?: number | null;
  notes?: string | null;
}): Promise<Commitment> {
  const { data, error } = await supabase.rpc("v2_confirm_commitment", {
    _commitment_id: input.commitmentId,
    _accepted: input.accepted,
    _confirmed_quantity: input.quantity ?? null,
    _unit_code: input.unitCode ?? null,
    _start: input.start ?? null,
    _end: input.end ?? null,
    _unit_price: input.unitPrice ?? null,
    _notes: input.notes ?? null,
  });
  if (error) throw error;
  return data as unknown as Commitment;
}

export async function releaseCommitment(commitmentId: string, reason: string | null, cancel = false) {
  const { error } = await supabase.rpc("v2_release_commitment", {
    _commitment_id: commitmentId,
    _reason: reason,
    _cancel: cancel,
  });
  if (error) throw error;
}

export async function expireCommitments(): Promise<number> {
  const { data, error } = await supabase.rpc("v2_expire_commitments");
  if (error) throw error;
  return (data as number) ?? 0;
}

export async function fetchConfirmationFeed(): Promise<ConfirmationFeedRow[]> {
  const { data, error } = await supabase.rpc("v2_commercial_confirmation_feed");
  if (error) throw error;
  return data ?? [];
}

export async function fetchSupplierContact(supplierId: string, organizationId: string) {
  const { data, error } = await supabase.rpc("v2_supplier_commercial_contact", {
    _supplier_id: supplierId,
    _organization_id: organizationId,
  });
  if (error) throw error;
  return data?.[0] ?? null;
}

/* --------------------------- procurement orders --------------------------- */

export async function createProcurementOrder(input: {
  commitmentId: string;
  expectedStart?: string | null;
  expectedEnd?: string | null;
  deliveryLocation?: string | null;
  unitPrice?: number | null;
  priceUnit?: string | null;
  qualityRequirement?: string | null;
  packagingRequirement?: string | null;
  notes?: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc("v2_create_procurement_order", {
    _commitment_id: input.commitmentId,
    _expected_start: input.expectedStart ?? null,
    _expected_end: input.expectedEnd ?? null,
    _delivery_location: input.deliveryLocation ?? null,
    _unit_price: input.unitPrice ?? null,
    _price_unit: input.priceUnit ?? null,
    _quality_requirement: input.qualityRequirement ?? null,
    _packaging_requirement: input.packagingRequirement ?? null,
    _notes: input.notes ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function cancelProcurementOrder(orderId: string, reason: string | null) {
  const { error } = await supabase.rpc("v2_cancel_procurement_order", { _order_id: orderId, _reason: reason });
  if (error) throw error;
}

export async function fetchOrders(organizationId: string): Promise<ProcurementOrder[]> {
  const { data, error } = await supabase
    .from("v2_procurement_orders")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export type OrderBundle = {
  order: ProcurementOrder;
  lines: ProcurementOrderLine[];
  deliveries: Delivery[];
  receipts: GoodsReceipt[];
  batches: RawMaterialBatch[];
  commitment: Commitment | null;
};

export async function fetchOrderBundle(orderId: string): Promise<OrderBundle | null> {
  const { data: order, error } = await supabase.from("v2_procurement_orders").select("*").eq("id", orderId).maybeSingle();
  if (error) throw error;
  if (!order) return null;

  const [lines, deliveries, receipts, batches, commitment] = await Promise.all([
    supabase.from("v2_procurement_order_lines").select("*").eq("order_id", orderId).order("created_at"),
    supabase.from("v2_deliveries").select("*").eq("order_id", orderId).order("created_at"),
    supabase.from("v2_goods_receipts").select("*").eq("order_id", orderId).order("received_at", { ascending: false }),
    supabase.from("v2_raw_material_batches").select("*").eq("order_id", orderId).order("created_at", { ascending: false }),
    order.commitment_id
      ? supabase.from("v2_supply_commitments").select("*").eq("id", order.commitment_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    order,
    lines: lines.data ?? [],
    deliveries: deliveries.data ?? [],
    receipts: receipts.data ?? [],
    batches: batches.data ?? [],
    commitment: (commitment as { data: Commitment | null }).data ?? null,
  };
}

export async function updateOrder(orderId: string, patch: Partial<Tables["v2_procurement_orders"]["Update"]>) {
  const { error } = await supabase.from("v2_procurement_orders").update(patch).eq("id", orderId);
  if (error) throw error;
}

/* ------------------------------- deliveries ------------------------------- */

export async function createDelivery(input: {
  order: ProcurementOrder;
  scheduledDate: string | null;
  declaredQuantity: number | null;
  unitCode: string;
  notes?: string | null;
  userId: string;
}): Promise<Delivery> {
  const reference = `DL-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${input.order.order_number.slice(-4)}`;
  const { data, error } = await supabase
    .from("v2_deliveries")
    .insert({
      reference,
      order_id: input.order.id,
      organization_id: input.order.organization_id,
      facility_id: input.order.facility_id,
      supplier_id: input.order.supplier_id,
      scheduled_date: input.scheduledDate,
      declared_quantity: input.declaredQuantity,
      unit_code: input.unitCode,
      notes: input.notes ?? null,
      created_by: input.userId,
    })
    .select("*")
    .single();
  if (error) throw error;
  await supabase.from("v2_procurement_orders").update({ status: "ready_for_delivery" }).eq("id", input.order.id).in("status", ["confirmed"]);
  return data;
}

export async function setDeliveryStatus(deliveryId: string, status: DeliveryStatus, patch: Partial<Tables["v2_deliveries"]["Update"]> = {}) {
  const { error } = await supabase.from("v2_deliveries").update({ status, ...patch }).eq("id", deliveryId);
  if (error) throw error;
}

/* ------------------------------ goods receipt ----------------------------- */

export async function receiveGoods(input: {
  deliveryId: string;
  deliveredQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  unitCode: string;
  qualityResult: "accepted" | "accepted_with_reservation" | "partially_accepted" | "rejected";
  qualityGrade?: string | null;
  conditionNotes?: string | null;
  receivingNotes?: string | null;
  photos?: string[];
  acceptOverDelivery?: boolean;
  storageLocation?: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc("v2_receive_goods", {
    _delivery_id: input.deliveryId,
    _delivered_quantity: input.deliveredQuantity,
    _accepted_quantity: input.acceptedQuantity,
    _rejected_quantity: input.rejectedQuantity,
    _unit_code: input.unitCode,
    _quality_result: input.qualityResult,
    _quality_grade: input.qualityGrade ?? null,
    _condition_notes: input.conditionNotes ?? null,
    _receiving_notes: input.receivingNotes ?? null,
    _photos: (input.photos ?? []) as unknown as Database["public"]["Tables"]["v2_goods_receipts"]["Row"]["photos"],
    _accept_over_delivery: input.acceptOverDelivery ?? false,
    _storage_location: input.storageLocation ?? null,
  });
  if (error) throw error;
  return data as string;
}

/* -------------------------------- inventory ------------------------------- */

export async function fetchInventoryBalance(organizationId: string, facilityId?: string | null): Promise<InventoryBalanceRow[]> {
  const { data, error } = await supabase.rpc("v2_inventory_balance", {
    _organization_id: organizationId,
    _facility_id: facilityId ?? null,
  });
  if (error) throw error;
  return data ?? [];
}

export async function fetchBatches(organizationId: string): Promise<RawMaterialBatch[]> {
  const { data, error } = await supabase
    .from("v2_raw_material_batches")
    .select("*")
    .eq("organization_id", organizationId)
    .order("receipt_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchMovements(organizationId: string, limit = 50): Promise<InventoryMovement[]> {
  const { data, error } = await supabase
    .from("v2_inventory_movements")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/* --------------------------------- read-side ------------------------------ */

export async function fetchFunnel(requestId: string): Promise<FunnelRow | null> {
  const { data, error } = await supabase.rpc("v2_sourcing_funnel", { _request_id: requestId });
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function fetchProcurementSummary(organizationId: string): Promise<ProcurementSummaryRow | null> {
  const { data, error } = await supabase.rpc("v2_procurement_summary", { _organization_id: organizationId });
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function fetchNotifications(organizationId: string, limit = 20): Promise<NotificationEvent[]> {
  const { data, error } = await supabase
    .from("v2_notification_events")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/* --------------------------------- helpers -------------------------------- */

/** Tonnes still open on an order line (ordered − accepted). */
export function outstandingTonnes(line: ProcurementOrderLine | undefined): number {
  if (!line) return 0;
  return Math.max(0, Number(line.ordered_tonnes ?? 0) - Number(line.accepted_tonnes ?? 0));
}

/** Deterministic acceptance summary used by the receipt form. */
export function receiptOutcome(delivered: number, accepted: number, rejected: number) {
  if (accepted <= 0) return "rejected" as const;
  if (rejected > 0 || accepted < delivered) return "partially_accepted" as const;
  return "accepted" as const;
}
