// AGRI-GRID V2 — configurable agricultural reference data (value chains, crops,
// varieties, units). Keeps crop / variety / unit names out of free text.
import { supabase } from "@/integrations/supabase/client";

export type V2ValueChain = { id: string; code: string; name_fr: string; name_en: string; is_active: boolean; sort_order: number };
export type V2Crop = {
  id: string;
  value_chain_id: string | null;
  code: string;
  name_fr: string;
  name_en: string;
  default_unit_code: string | null;
  is_active: boolean;
  sort_order: number;
};
export type V2Variety = { id: string; crop_id: string; code: string; name_fr: string; name_en: string; is_active: boolean; sort_order: number };
export type V2Unit = { id: string; code: string; name_fr: string; name_en: string; dimension: string; is_active: boolean; sort_order: number };

export type ReferenceData = {
  valueChains: V2ValueChain[];
  crops: V2Crop[];
  varieties: V2Variety[];
  units: V2Unit[];
};

export const EMPTY_REFERENCE: ReferenceData = { valueChains: [], crops: [], varieties: [], units: [] };

let cache: ReferenceData | null = null;

export async function fetchReferenceData(force = false): Promise<ReferenceData> {
  if (cache && !force) return cache;
  const [vc, crops, varieties, units] = await Promise.all([
    supabase.from("v2_value_chains").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("v2_crops").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("v2_crop_varieties").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("v2_units").select("*").eq("is_active", true).order("sort_order"),
  ]);

  cache = {
    valueChains: (vc.data as V2ValueChain[]) ?? [],
    crops: (crops.data as V2Crop[]) ?? [],
    varieties: (varieties.data as V2Variety[]) ?? [],
    units: (units.data as V2Unit[]) ?? [],
  };
  return cache;
}

/** Localised label helper — the model stays multilingual and country-extensible. */
export function refLabel(item: { name_fr: string; name_en: string } | null | undefined, lang: string): string {
  if (!item) return "—";
  return lang?.startsWith("fr") ? item.name_fr : item.name_en;
}

export function unitLabel(ref: ReferenceData, code: string | null | undefined, lang: string): string {
  if (!code) return "";
  const unit = ref.units.find((u) => u.code === code);
  return unit ? refLabel(unit, lang) : code;
}

export function varietiesForCrop(ref: ReferenceData, cropId: string | null | undefined): V2Variety[] {
  if (!cropId) return [];
  return ref.varieties.filter((v) => v.crop_id === cropId);
}

export const MASS_UNIT_CODES = ["kg", "t", "sac", "piece"];
export const AREA_UNIT_CODES = ["ha", "m2"];
