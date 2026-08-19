// AGRI-GRID V2 — Phase 1C: commercial supply intelligence access layer.
// Processors NEVER read supplier tables directly: every read goes through the
// privacy-preserving RPCs (identity, phone, exact GPS and field notes stay internal).
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Fn = Database["public"]["Functions"];

export type CommercialSupplyRow = Fn["v2_commercial_supply"]["Returns"][number];
export type SupplyHistoryRow = Fn["v2_commercial_supply_history"]["Returns"][number];
export type PipelineRow = Fn["v2_supply_pipeline"]["Returns"][number];
export type CoverageRow = Fn["v2_supply_coverage"]["Returns"][number];
export type DataQualityRow = Fn["v2_data_quality_summary"]["Returns"][number];

export type Confidence = "high" | "medium" | "low";
export type Freshness = "fresh" | "aging" | "stale";

export type SupplyFilters = {
  facilityId?: string | null;
  cropId?: string | null;
  varietyId?: string | null;
  department?: string | null;
  commune?: string | null;
  qualityGrade?: string | null;
  confidence?: Confidence[];
  freshness?: Freshness[];
  maxDistanceKm?: number | null;
  availableFrom?: string | null;
  availableTo?: string | null;
  minQuantityT?: number | null;
  verifiedOnly?: boolean;
  search?: string | null;
  limit?: number;
  offset?: number;
};

const clean = <T,>(v: T | null | undefined): T | undefined => (v === null || v === "" ? undefined : (v as T));

export async function fetchCommercialSupply(f: SupplyFilters = {}): Promise<{ rows: CommercialSupplyRow[]; total: number }> {
  const { data, error } = await supabase.rpc("v2_commercial_supply", {
    _facility_id: clean(f.facilityId),
    _crop_id: clean(f.cropId),
    _variety_id: clean(f.varietyId),
    _department: clean(f.department),
    _commune: clean(f.commune),
    _quality_grade: clean(f.qualityGrade),
    _confidence: f.confidence?.length ? f.confidence : undefined,
    _freshness: f.freshness?.length ? f.freshness : undefined,
    _max_distance_km: clean(f.maxDistanceKm),
    _available_from: clean(f.availableFrom),
    _available_to: clean(f.availableTo),
    _min_quantity_t: clean(f.minQuantityT),
    _verified_only: f.verifiedOnly || undefined,
    _search: clean(f.search),
    _limit: f.limit ?? 50,
    _offset: f.offset ?? 0,
  });
  if (error) throw error;
  const rows = (data ?? []) as CommercialSupplyRow[];
  return { rows, total: rows.length ? Number(rows[0].total_count ?? rows.length) : 0 };
}

export async function fetchSupplyHistory(supplyId: string): Promise<SupplyHistoryRow[]> {
  const { data, error } = await supabase.rpc("v2_commercial_supply_history", { _supply_id: supplyId });
  if (error) throw error;
  return (data ?? []) as SupplyHistoryRow[];
}

export async function fetchSupplyPipeline(opts: {
  facilityId?: string | null;
  cropId?: string | null;
  varietyId?: string | null;
  maxDistanceKm?: number | null;
}): Promise<PipelineRow[]> {
  const { data, error } = await supabase.rpc("v2_supply_pipeline", {
    _facility_id: clean(opts.facilityId),
    _crop_id: clean(opts.cropId),
    _variety_id: clean(opts.varietyId),
    _max_distance_km: clean(opts.maxDistanceKm),
  });
  if (error) throw error;
  return (data ?? []) as PipelineRow[];
}

export async function fetchSupplyCoverage(organizationId: string, facilityId?: string | null): Promise<CoverageRow[]> {
  const { data, error } = await supabase.rpc("v2_supply_coverage", {
    _organization_id: organizationId,
    _facility_id: clean(facilityId),
  });
  if (error) throw error;
  return (data ?? []) as CoverageRow[];
}

export async function fetchDataQualitySummary(): Promise<DataQualityRow[]> {
  const { data, error } = await supabase.rpc("v2_data_quality_summary");
  if (error) throw error;
  return (data ?? []) as DataQualityRow[];
}

/** Deterministic aggregation of a supply feed (already normalised to tonnes server-side). */
export function summarise(rows: CommercialSupplyRow[]) {
  const tonnes = rows.reduce((s, r) => s + Number(r.quantity_tonnes ?? 0), 0);
  const suppliers = new Set(rows.map((r) => r.supplier_ref)).size;
  const confirmed = rows.filter((r) => r.supply_status === "available").reduce((s, r) => s + Number(r.quantity_tonnes ?? 0), 0);
  const nearest = rows.reduce<number | null>((m, r) => {
    const d = r.distance_km == null ? null : Number(r.distance_km);
    if (d == null) return m;
    return m == null || d < m ? d : m;
  }, null);
  return {
    tonnes: Math.round(tonnes * 100) / 100,
    confirmedTonnes: Math.round(confirmed * 100) / 100,
    suppliers,
    records: rows.length,
    nearestKm: nearest,
  };
}

export const CONFIDENCE_TONE: Record<string, "success" | "warning" | "neutral"> = {
  high: "success",
  medium: "warning",
  low: "neutral",
};

export const FRESHNESS_TONE: Record<string, "success" | "warning" | "danger"> = {
  fresh: "success",
  aging: "warning",
  stale: "danger",
};

export const PIPELINE_BUCKETS = ["0_30", "31_60", "61_90", "90_plus"] as const;
