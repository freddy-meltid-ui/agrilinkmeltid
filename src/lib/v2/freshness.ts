// AGRI-GRID V2 — deterministic, configurable data-freshness calculation.
// Thresholds live in the DB (v2_settings.supply_freshness_thresholds) and are
// cached here. UI components must never hard-code day counts.
import { supabase } from "@/integrations/supabase/client";

export type FreshnessStatus = "fresh" | "aging" | "needs_verification" | "unknown";

export type FreshnessThresholds = {
  freshMaxDays: number;
  agingMaxDays: number;
};

export const DEFAULT_FRESHNESS_THRESHOLDS: FreshnessThresholds = {
  freshMaxDays: 7,
  agingMaxDays: 21,
};

let cached: FreshnessThresholds = DEFAULT_FRESHNESS_THRESHOLDS;
let loaded = false;

export function getFreshnessThresholds(): FreshnessThresholds {
  return cached;
}

export async function loadFreshnessThresholds(force = false): Promise<FreshnessThresholds> {
  if (loaded && !force) return cached;
  const { data } = await supabase
    .from("v2_settings")
    .select("value")
    .eq("key", "supply_freshness_thresholds")
    .maybeSingle();

  const value = (data?.value ?? null) as { fresh_max_days?: number; aging_max_days?: number } | null;
  if (value) {
    cached = {
      freshMaxDays: value.fresh_max_days ?? DEFAULT_FRESHNESS_THRESHOLDS.freshMaxDays,
      agingMaxDays: value.aging_max_days ?? DEFAULT_FRESHNESS_THRESHOLDS.agingMaxDays,
    };
  }
  loaded = true;
  return cached;
}

export function daysSince(value?: string | null): number | null {
  if (!value) return null;
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return null;
  return Math.floor((Date.now() - ts) / 86_400_000);
}

export function computeFreshness(
  value?: string | null,
  thresholds: FreshnessThresholds = cached,
): { status: FreshnessStatus; days: number | null } {
  const days = daysSince(value);
  if (days === null) return { status: "unknown", days: null };
  if (days <= thresholds.freshMaxDays) return { status: "fresh", days };
  if (days <= thresholds.agingMaxDays) return { status: "aging", days };
  return { status: "needs_verification", days };
}

/** Most recent trustworthy signal for a supply record. */
export function supplyReferenceDate(record: {
  last_confirmed_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}): string | null {
  return record.last_confirmed_at ?? record.updated_at ?? record.created_at ?? null;
}

export const FRESHNESS_TONE: Record<FreshnessStatus, "success" | "warning" | "danger" | "neutral"> = {
  fresh: "success",
  aging: "warning",
  needs_verification: "danger",
  unknown: "neutral",
};

export const FRESHNESS_LABEL_KEY: Record<FreshnessStatus, string> = {
  fresh: "v2.field.freshness.fresh",
  aging: "v2.field.freshness.aging",
  needs_verification: "v2.field.freshness.needsVerification",
  unknown: "v2.field.freshness.unknown",
};
