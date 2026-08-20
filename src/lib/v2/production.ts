// AGRI-GRID V2 — Phase 2A: processing operations, production batches,
// finished-goods inventory and end-to-end traceability.
//
// ARCHITECTURE
// ------------
// Nothing about stock is computed in the browser. Every write that touches
// inventory goes through a SECURITY DEFINER RPC that locks the raw-material
// batches it consumes:
//
//   v2_post_production        atomic: consume raw batches → production batch →
//                             inputs/outputs → finished batches + FG ledger
//   v2_void_production        compensating reversal, nothing is ever deleted
//   v2_finished_goods_stock   read model for finished-goods inventory
//   v2_production_summary     KPIs for the operations hub
//   v2_trace_finished_batch   backward trace: finished lot → suppliers
//   v2_trace_raw_batch        forward trace: raw batch → finished lots
//
// STOCK RULE (mirrors the database):
//   Raw-material stock only moves through v2_inventory_movements. Production
//   posts negative `production_consumption` rows; a void posts a positive
//   compensating row. A production run that would drive any batch below zero is
//   rejected with INSUFFICIENT_RAW_MATERIAL_STOCK and nothing at all is written.
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import type { StatusTone } from "@/components/v2/ui-kit/StatusBadge";

type Tables = Database["public"]["Tables"];
type Fn = Database["public"]["Functions"];

export type ProductionBatch = Tables["v2_production_batches"]["Row"];
export type ProductionInput = Tables["v2_production_inputs"]["Row"];
export type ProductionOutput = Tables["v2_production_outputs"]["Row"];
export type ProductionRecipe = Tables["v2_production_recipes"]["Row"];
export type FinishedProductBatch = Tables["v2_finished_product_batches"]["Row"];
export type FinishedGoodsMovement = Tables["v2_finished_goods_movements"]["Row"];
export type ProcessedProduct = Tables["v2_processed_products"]["Row"];
export type FinishedGoodsStockRow = Fn["v2_finished_goods_stock"]["Returns"][number];
export type ProductionSummaryRow = Fn["v2_production_summary"]["Returns"][number];

export const PRODUCTION_TONE: Record<string, StatusTone> = {
  draft: "neutral",
  in_progress: "info",
  completed: "success",
  voided: "danger",
};

export const FG_TONE: Record<string, StatusTone> = {
  available: "success",
  reserved: "info",
  consumed: "neutral",
  written_off: "danger",
  voided: "danger",
};

/** Turns a Postgres exception raised by the production RPCs into a code we can translate. */
export function parseProductionError(message: string): { code: string; value?: string; raw: string } {
  const known = [
    "INSUFFICIENT_RAW_MATERIAL_STOCK",
    "NO_INPUTS",
    "NO_OUTPUTS",
    "INVALID_QUANTITY",
    "BATCH_NOT_FOUND",
    "PRODUCTION_NOT_FOUND",
    "PRODUCTION_NOT_COMPLETED",
    "ALREADY_VOIDED",
    "FINISHED_BATCH_CONSUMED",
    "NOT_AUTHORIZED",
  ];
  for (const code of known) {
    const at = message.indexOf(code);
    if (at >= 0) {
      const m = message.slice(at + code.length).match(/^:([^\s"]+(?::[^\s"]+)*)/);
      return { code, value: m?.[1], raw: message };
    }
  }
  return { code: "UNKNOWN", raw: message };
}

/* --------------------------------- reads --------------------------------- */

export async function fetchProductionSummary(organizationId: string): Promise<ProductionSummaryRow | null> {
  const { data, error } = await supabase.rpc("v2_production_summary", { _organization_id: organizationId });
  if (error) throw error;
  return data?.[0] ?? null;
}

export type ProductionBatchRow = ProductionBatch & {
  product?: { product_name: string } | null;
  facility?: { name: string } | null;
};

export async function fetchProductionBatches(organizationId: string): Promise<ProductionBatchRow[]> {
  const { data, error } = await supabase
    .from("v2_production_batches")
    .select("*, product:v2_processed_products(product_name), facility:v2_processing_facilities(name)")
    .eq("organization_id", organizationId)
    .order("production_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ProductionBatchRow[];
}

export type ProductionDetail = {
  batch: ProductionBatchRow;
  inputs: (ProductionInput & {
    raw_batch?: { batch_reference: string; supplier_id: string | null } | null;
    crop?: { name_fr: string; name_en: string } | null;
  })[];
  outputs: ProductionOutput[];
  finished: FinishedProductBatch[];
};

export async function fetchProductionDetail(id: string): Promise<ProductionDetail | null> {
  const [b, i, o, f] = await Promise.all([
    supabase
      .from("v2_production_batches")
      .select("*, product:v2_processed_products(product_name), facility:v2_processing_facilities(name)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("v2_production_inputs")
      .select("*, raw_batch:v2_raw_material_batches(batch_reference, supplier_id), crop:v2_crops(name_fr, name_en)")
      .eq("production_batch_id", id),
    supabase.from("v2_production_outputs").select("*").eq("production_batch_id", id),
    supabase.from("v2_finished_product_batches").select("*").eq("production_batch_id", id),
  ]);
  if (b.error) throw b.error;
  if (!b.data) return null;
  return {
    batch: b.data as unknown as ProductionBatchRow,
    inputs: (i.data ?? []) as ProductionDetail["inputs"],
    outputs: (o.data ?? []) as ProductionOutput[],
    finished: (f.data ?? []) as FinishedProductBatch[],
  };
}

export async function fetchProducts(organizationId: string): Promise<ProcessedProduct[]> {
  const { data, error } = await supabase
    .from("v2_processed_products")
    .select("*")
    .eq("organization_id", organizationId)
    .order("product_name");
  if (error) throw error;
  return data ?? [];
}

export type RecipeWithLines = ProductionRecipe & {
  inputs: Tables["v2_production_recipe_inputs"]["Row"][];
  outputs: Tables["v2_production_recipe_outputs"]["Row"][];
};

export async function fetchRecipes(organizationId: string): Promise<RecipeWithLines[]> {
  const { data, error } = await supabase
    .from("v2_production_recipes")
    .select("*, inputs:v2_production_recipe_inputs(*), outputs:v2_production_recipe_outputs(*)")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return (data ?? []) as unknown as RecipeWithLines[];
}

export type AvailableRawBatch = Tables["v2_raw_material_batches"]["Row"] & {
  crop?: { name_fr: string; name_en: string } | null;
  variety?: { name_fr: string; name_en: string } | null;
  supplier?: { display_name: string | null; supplier_code: string | null } | null;
};

/** Raw-material batches with stock left — the only thing a production run may consume. */
export async function fetchAvailableRawBatches(organizationId: string): Promise<AvailableRawBatch[]> {
  const { data, error } = await supabase
    .from("v2_raw_material_batches")
    .select(
      "*, crop:v2_crops(name_fr, name_en), variety:v2_crop_varieties(name_fr, name_en), supplier:v2_suppliers(display_name, supplier_code)",
    )
    .eq("organization_id", organizationId)
    .gt("current_tonnes", 0)
    .order("receipt_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as AvailableRawBatch[];
}

export async function fetchFinishedGoodsStock(
  organizationId: string,
  facilityId?: string | null,
): Promise<FinishedGoodsStockRow[]> {
  const { data, error } = await supabase.rpc("v2_finished_goods_stock", {
    _organization_id: organizationId,
    _facility_id: facilityId ?? undefined,
  });
  if (error) throw error;
  return data ?? [];
}

export async function fetchFinishedGoodsMovements(organizationId: string, limit = 60): Promise<FinishedGoodsMovement[]> {
  const { data, error } = await supabase
    .from("v2_finished_goods_movements")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/* --------------------------------- writes -------------------------------- */

export type PostProductionInput = { raw_material_batch_id: string; quantity_tonnes: number };
export type PostProductionOutput = {
  output_type: "finished_product" | "by_product" | "waste";
  product_id?: string | null;
  label?: string | null;
  quantity: number;
  unit_code: string;
  storage_location?: string | null;
  quality_status?: string | null;
  expiry_date?: string | null;
  loss_category?: string | null;
};

export type PostProductionResult = {
  production_batch_id: string;
  batch_reference: string;
  total_input_tonnes: number;
  finished_batches: { id: string; reference: string; quantity: number; unit_code: string }[];
};

export async function postProduction(args: {
  organizationId: string;
  facilityId: string;
  productId: string;
  inputs: PostProductionInput[];
  outputs: PostProductionOutput[];
  recipeId?: string | null;
  productionDate?: string;
  notes?: string | null;
}): Promise<PostProductionResult> {
  const { data, error } = await supabase.rpc("v2_post_production", {
    _organization_id: args.organizationId,
    _facility_id: args.facilityId,
    _product_id: args.productId,
    _inputs: args.inputs as unknown as Json,
    _outputs: args.outputs as unknown as Json,
    _recipe_id: args.recipeId ?? undefined,
    _production_date: args.productionDate ?? undefined,
    _notes: args.notes ?? undefined,
  });
  if (error) throw error;
  return data as unknown as PostProductionResult;
}

export async function voidProduction(productionBatchId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc("v2_void_production", {
    _production_batch_id: productionBatchId,
    _reason: reason,
  });
  if (error) throw error;
}

/* ------------------------------ traceability ------------------------------ */

export type TraceSupplier = {
  id: string;
  code: string | null;
  type: string | null;
  commune: string | null;
  department: string | null;
  display_name: string | null;
  contact_released: boolean;
};

export type BackwardTrace = {
  finished_batch: {
    id: string;
    reference: string;
    product: string | null;
    quantity: number;
    unit_code: string;
    status: string;
    production_date: string;
    expiry_date: string | null;
  };
  production_batch: {
    id: string;
    reference: string;
    status: string;
    production_date: string;
    total_input_tonnes: number;
    notes: string | null;
  };
  inputs: {
    raw_batch_id: string;
    raw_batch_reference: string;
    quantity_tonnes: number;
    crop: string | null;
    variety: string | null;
    farm: string | null;
    crop_cycle_id: string | null;
    quality_status: string | null;
    receipt_reference: string | null;
    receipt_date: string | null;
    delivery_reference: string | null;
    order_number: string | null;
    supplier: TraceSupplier | null;
  }[];
};

export type ForwardTrace = {
  raw_batch: { id: string; reference: string; current_tonnes: number; crop: string | null; variety: string | null };
  productions: {
    production_batch_id: string;
    production_reference: string;
    production_date: string;
    status: string;
    quantity_tonnes: number;
    finished_batches: { id: string; reference: string; product: string | null; quantity: number; unit_code: string; status: string }[];
  }[];
};

export async function traceFinishedBatch(finishedBatchId: string): Promise<BackwardTrace> {
  const { data, error } = await supabase.rpc("v2_trace_finished_batch", { _finished_batch_id: finishedBatchId });
  if (error) throw error;
  return data as unknown as BackwardTrace;
}

export async function traceRawBatch(rawBatchId: string): Promise<ForwardTrace> {
  const { data, error } = await supabase.rpc("v2_trace_raw_batch", { _raw_batch_id: rawBatchId });
  if (error) throw error;
  return data as unknown as ForwardTrace;
}
