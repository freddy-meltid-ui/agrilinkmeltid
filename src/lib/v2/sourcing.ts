// AGRI-GRID V2 — Phase 1D: sourcing requests + deterministic matching domain layer.
//
// ARCHITECTURE
// ------------
// * Matching itself runs in the database (`v2_sourcing_matches` RPC). The browser never
//   downloads the supply base: crop / variety / window / geography / freshness filtering
//   and scoring all happen server-side and only candidate rows come back.
// * This module is the only place the UI talks to for sourcing. It owns:
//     - request CRUD + lifecycle,
//     - the greedy multi-supplier coverage algorithm,
//     - coverage aggregation and match-run snapshots,
//     - reconfirmation tasks and the sourcing event log.
// * No generative AI is involved anywhere in the matching path.
//
// SCORE MODEL (weights are configurable in v2_settings → `sourcing_match_weights`)
// -------------------------------------------------------------------------------
//   product 30 · availability 20 · distance 20 · freshness 15 · confidence 10 · quality 5
//   Each dimension yields a 0..1 factor; score = Σ(weight × factor), 0..100.
//
// HARD FILTERS (a candidate failing any of these is NEVER a primary match)
// -----------------------------------------------------------------------
//   wrong crop (excluded from the result set entirely)
//   no overlap with the requested window            → no_window_overlap
//   zero available quantity                          → no_quantity
//   outside the radius when the processor made it strict → outside_strict_radius
//   mandatory certification missing                  → missing_required_certification
//   variety mismatch when the processor is not flexible → variety_mismatch
//   more than soft_radius_factor × radius away       → far_outside_radius
//   data older than the "needs verification" threshold → stale_data
// Such rows are returned as `near_match` with their blocking reasons, never mixed in.
//
// SOFT PREFERENCES (scored, never blocking): shorter distance, fresher data,
// higher confidence, larger volume, preferred quality/variety.
//
// DOUBLE ALLOCATION
// -----------------
// There are no reservations in Phase 1D. The same tonne of supply can appear against
// several requests. Everything surfaced here is *identified potential supply*, advisory
// only. When reservations arrive they will subtract from `quantity_tonnes` at RPC level,
// so no UI change will be needed.
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
type Fn = Database["public"]["Functions"];

export type SourcingRequest = Tables["v2_sourcing_requests"]["Row"];
export type SourcingRequestInsert = Tables["v2_sourcing_requests"]["Insert"];
export type SourcingStatus = Database["public"]["Enums"]["v2_sourcing_status"];
export type ReconfirmationStatus = Database["public"]["Enums"]["v2_reconfirmation_status"];
export type MatchRow = Fn["v2_sourcing_matches"]["Returns"][number];
export type MatchRun = Tables["v2_sourcing_match_runs"]["Row"];
export type SourcingEvent = Tables["v2_sourcing_events"]["Row"];
export type ReconfirmationTask = Tables["v2_reconfirmation_tasks"]["Row"];
export type TaskFeedRow = Fn["v2_reconfirmation_task_feed"]["Returns"][number];
export type DemandRow = Fn["v2_sourcing_demand_intelligence"]["Returns"][number];

export const SOURCING_STATUSES: SourcingStatus[] = [
  "draft",
  "open",
  "matching",
  "reviewing",
  "ready_for_confirmation",
  "partially_covered",
  "covered",
  "cancelled",
  "expired",
];

export const DEFAULT_WEIGHTS = {
  product: 30,
  availability: 20,
  distance: 20,
  freshness: 15,
  confidence: 10,
  quality: 5,
  soft_radius_factor: 1.5,
};

export type MatchWeights = typeof DEFAULT_WEIGHTS;

export async function fetchMatchWeights(): Promise<MatchWeights> {
  const { data } = await supabase.from("v2_settings").select("value").eq("key", "sourcing_match_weights").maybeSingle();
  return { ...DEFAULT_WEIGHTS, ...((data?.value as Partial<MatchWeights>) ?? {}) };
}

/* ------------------------------- requests -------------------------------- */

export async function fetchSourcingRequests(organizationId: string): Promise<SourcingRequest[]> {
  const { data, error } = await supabase
    .from("v2_sourcing_requests")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SourcingRequest[];
}

export async function fetchSourcingRequest(id: string): Promise<SourcingRequest | null> {
  const { data, error } = await supabase.from("v2_sourcing_requests").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as SourcingRequest) ?? null;
}

export async function createSourcingRequest(payload: SourcingRequestInsert): Promise<SourcingRequest> {
  const { data, error } = await supabase.from("v2_sourcing_requests").insert(payload).select("*").single();
  if (error) throw error;
  await logSourcingEvent(data.id, "request_created", { status: data.status, reference: data.reference });
  return data as SourcingRequest;
}

export async function updateSourcingRequest(id: string, patch: Partial<SourcingRequestInsert>): Promise<SourcingRequest> {
  const { data, error } = await supabase.from("v2_sourcing_requests").update(patch).eq("id", id).select("*").single();
  if (error) throw error;
  await logSourcingEvent(id, "request_updated", patch as Record<string, unknown>);
  return data as SourcingRequest;
}

export async function setSourcingStatus(id: string, status: SourcingStatus) {
  const { error } = await supabase.from("v2_sourcing_requests").update({ status }).eq("id", id);
  if (error) throw error;
  await logSourcingEvent(id, "status_changed", { status });
}

/* --------------------------------- events -------------------------------- */

export async function logSourcingEvent(requestId: string, eventType: string, payload: Record<string, unknown> = {}) {
  const { data: auth } = await supabase.auth.getUser();
  await supabase.from("v2_sourcing_events").insert({
    sourcing_request_id: requestId,
    event_type: eventType,
    payload: payload as never,
    actor_id: auth.user?.id ?? null,
  });
}

export async function fetchSourcingEvents(requestId: string): Promise<SourcingEvent[]> {
  const { data } = await supabase
    .from("v2_sourcing_events")
    .select("*")
    .eq("sourcing_request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as SourcingEvent[];
}

/* -------------------------------- matching -------------------------------- */

export async function fetchMatches(requestId: string): Promise<MatchRow[]> {
  const { data, error } = await supabase.rpc("v2_sourcing_matches", { _request_id: requestId });
  if (error) throw error;
  return (data ?? []) as MatchRow[];
}

export type CoverageSummary = {
  requestedTonnes: number;
  identifiedTonnes: number;
  highConfidenceTonnes: number;
  coverageRatio: number;
  highConfidenceGap: number;
  potentialGap: number;
  supplierCount: number;
  matchCount: number;
  nearMatchCount: number;
  weightedAvgDistanceKm: number | null;
};

const t2 = (n: number) => Math.round(n * 100) / 100;

/** Requested quantity expressed in tonnes (kg / t / sac handled; others fall back to the raw value). */
export function requestedTonnes(request: Pick<SourcingRequest, "requested_quantity" | "unit_code">): number {
  const q = Number(request.requested_quantity ?? 0);
  switch (request.unit_code) {
    case "kg":
      return t2(q / 1000);
    case "t":
      return t2(q);
    case "sac":
      return t2((q * 50) / 1000);
    default:
      return t2(q);
  }
}

/**
 * MULTI-SUPPLIER COVERAGE — transparent greedy algorithm.
 *
 * 1. Keep only hard-compatible rows (`match_class === "match"`).
 * 2. Sort by: high confidence first → fresher data → shortest distance → larger volume.
 *    (This is exactly the priority order documented for Phase 1D.)
 * 3. Walk the list, allocating from each supplier
 *      min(remaining need, available, max per supplier)
 *    and skipping a supplier whose usable volume is under the processor's
 *    "minimum acceptable supplier quantity" (unless it closes the remaining gap).
 * 4. Stop when the requested volume is covered.
 *
 * No solver, no AI: the result is reproducible and explainable line by line.
 */
export function recommendCoverage(
  matches: MatchRow[],
  opts: { requestedTonnes: number; minPerSupplierT?: number | null; maxPerSupplierT?: number | null },
): { allocations: { row: MatchRow; tonnes: number }[]; allocatedTonnes: number } {
  const rank = { high: 0, medium: 1, low: 2 } as Record<string, number>;
  const freshRank = { fresh: 0, aging: 1, needs_verification: 2, unknown: 3 } as Record<string, number>;

  const eligible = matches
    .filter((m) => m.match_class === "match" && Number(m.quantity_tonnes ?? 0) > 0)
    .sort(
      (a, b) =>
        (rank[a.confidence ?? "low"] ?? 3) - (rank[b.confidence ?? "low"] ?? 3) ||
        (freshRank[a.freshness ?? "unknown"] ?? 3) - (freshRank[b.freshness ?? "unknown"] ?? 3) ||
        (Number(a.distance_km ?? 9999) - Number(b.distance_km ?? 9999)) ||
        Number(b.quantity_tonnes ?? 0) - Number(a.quantity_tonnes ?? 0),
    );

  const allocations: { row: MatchRow; tonnes: number }[] = [];
  const seenSuppliers = new Set<string>();
  let remaining = opts.requestedTonnes;

  for (const row of eligible) {
    if (remaining <= 0.001) break;
    if (seenSuppliers.has(row.supplier_ref)) continue;
    const available = Number(row.quantity_tonnes ?? 0);
    const capped = opts.maxPerSupplierT ? Math.min(available, opts.maxPerSupplierT) : available;
    const take = t2(Math.min(capped, remaining));
    if (opts.minPerSupplierT && take < opts.minPerSupplierT && take < remaining) continue;
    if (take <= 0) continue;
    allocations.push({ row, tonnes: take });
    seenSuppliers.add(row.supplier_ref);
    remaining = t2(remaining - take);
  }

  return { allocations, allocatedTonnes: t2(allocations.reduce((s, a) => s + a.tonnes, 0)) };
}

export function summariseMatches(matches: MatchRow[], requested: number): CoverageSummary {
  const primary = matches.filter((m) => m.match_class === "match");
  const near = matches.filter((m) => m.match_class === "near_match");
  const identified = primary.reduce((s, m) => s + Number(m.quantity_tonnes ?? 0), 0);
  const highConfidence = primary
    .filter((m) => m.confidence === "high")
    .reduce((s, m) => s + Number(m.quantity_tonnes ?? 0), 0);
  const withDistance = primary.filter((m) => m.distance_km != null && Number(m.quantity_tonnes ?? 0) > 0);
  const weight = withDistance.reduce((s, m) => s + Number(m.quantity_tonnes ?? 0), 0);
  const weighted = weight
    ? withDistance.reduce((s, m) => s + Number(m.distance_km) * Number(m.quantity_tonnes ?? 0), 0) / weight
    : null;

  return {
    requestedTonnes: t2(requested),
    identifiedTonnes: t2(identified),
    highConfidenceTonnes: t2(highConfidence),
    coverageRatio: requested > 0 ? t2(identified / requested) : 0,
    potentialGap: t2(Math.max(0, requested - identified)),
    highConfidenceGap: t2(Math.max(0, requested - highConfidence)),
    supplierCount: new Set(primary.map((m) => m.supplier_ref)).size,
    matchCount: primary.length,
    nearMatchCount: near.length,
    weightedAvgDistanceKm: weighted == null ? null : t2(weighted),
  };
}

/** Runs matching, records an auditable snapshot and moves the request status accordingly. */
export async function runMatching(request: SourcingRequest): Promise<{
  matches: MatchRow[];
  summary: CoverageSummary;
  recommended: { row: MatchRow; tonnes: number }[];
}> {
  const matches = await fetchMatches(request.id);
  const requested = requestedTonnes(request);
  const summary = summariseMatches(matches, requested);
  const { allocations } = recommendCoverage(matches, {
    requestedTonnes: requested,
    minPerSupplierT: request.min_quantity_per_supplier ? Number(request.min_quantity_per_supplier) : null,
    maxPerSupplierT: request.max_quantity_per_supplier ? Number(request.max_quantity_per_supplier) : null,
  });

  const { data: auth } = await supabase.auth.getUser();
  await supabase.from("v2_sourcing_match_runs").insert({
    sourcing_request_id: request.id,
    requested_tonnes: summary.requestedTonnes,
    identified_tonnes: summary.identifiedTonnes,
    high_confidence_tonnes: summary.highConfidenceTonnes,
    coverage_ratio: summary.coverageRatio,
    match_count: summary.matchCount,
    near_match_count: summary.nearMatchCount,
    supplier_count: summary.supplierCount,
    weighted_avg_distance_km: summary.weightedAvgDistanceKm,
    recommended_set: allocations.map((a) => ({
      supplier_ref: a.row.supplier_ref,
      supply_id: a.row.supply_id,
      tonnes: a.tonnes,
      score: a.row.score,
    })) as never,
    created_by: auth.user?.id ?? null,
  });

  await logSourcingEvent(request.id, "matching_run", {
    identified_tonnes: summary.identifiedTonnes,
    coverage_ratio: summary.coverageRatio,
    matches: summary.matchCount,
  });

  if (request.status !== "draft" && request.status !== "cancelled") {
    const next: SourcingStatus = summary.coverageRatio >= 1 ? "covered" : summary.identifiedTonnes > 0 ? "partially_covered" : "open";
    if (next !== request.status) await setSourcingStatus(request.id, next);
  }

  return { matches, summary, recommended: allocations };
}

export async function fetchLatestRuns(requestIds: string[]): Promise<Record<string, MatchRun>> {
  if (!requestIds.length) return {};
  const { data } = await supabase
    .from("v2_sourcing_match_runs")
    .select("*")
    .in("sourcing_request_id", requestIds)
    .order("created_at", { ascending: false });
  const out: Record<string, MatchRun> = {};
  for (const run of (data ?? []) as MatchRun[]) {
    if (!out[run.sourcing_request_id]) out[run.sourcing_request_id] = run;
  }
  return out;
}

/* -------------------------- reconfirmation tasks -------------------------- */

export async function fetchTaskFeed(): Promise<TaskFeedRow[]> {
  const { data, error } = await supabase.rpc("v2_reconfirmation_task_feed");
  if (error) throw error;
  return (data ?? []) as TaskFeedRow[];
}

export async function fetchTasksForRequest(requestId: string): Promise<ReconfirmationTask[]> {
  const { data } = await supabase
    .from("v2_reconfirmation_tasks")
    .select("*")
    .eq("sourcing_request_id", requestId)
    .order("created_at", { ascending: false });
  return (data ?? []) as ReconfirmationTask[];
}

export async function createReconfirmationTask(payload: {
  sourcing_request_id?: string | null;
  supplier_id: string;
  supply_id?: string | null;
  crop_id?: string | null;
  field_agent_id?: string | null;
  reason?: string | null;
  priority?: string;
  needed_by?: string | null;
  due_date?: string | null;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("v2_reconfirmation_tasks")
    .insert({
      ...payload,
      status: payload.field_agent_id ? "assigned" : "open",
      created_by: auth.user!.id,
    })
    .select("*")
    .single();
  if (error) throw error;
  if (payload.sourcing_request_id) {
    await logSourcingEvent(payload.sourcing_request_id, "reconfirmation_requested", {
      supplier_id: payload.supplier_id,
      supply_id: payload.supply_id,
    });
  }
  return data as ReconfirmationTask;
}

/**
 * Field agent confirmation. Updates the underlying supply record (quantity, window,
 * quality, confirmation timestamp) so the matching engine immediately reflects it,
 * then closes the task. This is the demand → field → supply feedback loop.
 */
export async function confirmReconfirmationTask(
  task: Pick<ReconfirmationTask, "id" | "supply_id" | "sourcing_request_id">,
  result: {
    available: boolean;
    quantity?: number | null;
    unit_code?: string | null;
    availability_start?: string | null;
    availability_end?: string | null;
    quality_grade?: string | null;
    asking_price?: number | null;
    observation?: string | null;
  },
) {
  const { data: auth } = await supabase.auth.getUser();

  if (result.available && task.supply_id) {
    const patch: Record<string, unknown> = {
      last_confirmed_at: new Date().toISOString(),
      confirmed_by: auth.user?.id ?? null,
      status: "available",
      source: "field_reconfirmation",
    };
    if (result.quantity != null) patch.quantity_available = result.quantity;
    if (result.unit_code) patch.unit_code = result.unit_code;
    if (result.availability_start) patch.availability_start = result.availability_start;
    if (result.availability_end) patch.availability_end = result.availability_end;
    if (result.quality_grade) patch.quality_grade = result.quality_grade;
    if (result.asking_price != null) patch.asking_price = result.asking_price;
    const { error } = await supabase
      .from("v2_supply_availability")
      .update(patch as never)
      .eq("id", task.supply_id);
    if (error) throw error;
  }

  const { error: taskError } = await supabase
    .from("v2_reconfirmation_tasks")
    .update({
      status: result.available ? "confirmed" : "not_available",
      result_quantity: result.quantity ?? null,
      result_unit_code: result.unit_code ?? null,
      result_available_start: result.availability_start ?? null,
      result_available_end: result.availability_end ?? null,
      result_quality_grade: result.quality_grade ?? null,
      result_asking_price: result.asking_price ?? null,
      observation: result.observation ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", task.id);
  if (taskError) throw taskError;

  if (task.sourcing_request_id) {
    await logSourcingEvent(task.sourcing_request_id, "supply_reconfirmed", {
      supply_id: task.supply_id,
      available: result.available,
      quantity: result.quantity,
    });
  }
}

export async function updateTaskStatus(id: string, status: ReconfirmationStatus) {
  const { error } = await supabase.from("v2_reconfirmation_tasks").update({ status }).eq("id", id);
  if (error) throw error;
}

/* --------------------------- demand intelligence -------------------------- */

export async function fetchDemandIntelligence(): Promise<DemandRow[]> {
  const { data, error } = await supabase.rpc("v2_sourcing_demand_intelligence");
  if (error) throw error;
  return (data ?? []) as DemandRow[];
}

export const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  draft: "neutral",
  open: "info",
  matching: "info",
  reviewing: "info",
  ready_for_confirmation: "success",
  partially_covered: "warning",
  covered: "success",
  cancelled: "neutral",
  expired: "danger",
};
