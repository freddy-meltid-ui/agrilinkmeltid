import { supabase } from "@/integrations/supabase/client";

export type Country = { id: string; code: string; name_fr: string; name_en: string };
export type Region = {
  id: string;
  country_id: string;
  name: string;
  agroecological_zone: string | null;
  rainfall_min_mm: number | null;
  rainfall_max_mm: number | null;
  dominant_soil_type: string | null;
  soil_fertility_level: "low" | "medium" | "high" | null;
  irrigation_potential: "low" | "medium" | "high" | null;
  main_constraints: string[] | null;
  centroid_lat: number | null;
  centroid_lng: number | null;
};
export type CropProfile = {
  id: string;
  crop_name: string;
  name_fr: string;
  water_need_mm_min: number | null;
  water_need_mm_max: number | null;
  preferred_soil: string[] | null;
  cycle_days: number | null;
  risk_factors: string[] | null;
};
export type CropRecommendation = {
  id: string;
  region_id: string;
  crop_id: string;
  suitability: "high" | "medium" | "low";
  recommendation_text: string | null;
  constraints: string[] | null;
};
export type YieldEstimate = {
  id: string;
  region_id: string;
  crop_id: string;
  yield_min_t_ha: number | null;
  yield_max_t_ha: number | null;
  confidence: "low" | "medium" | "high" | null;
  assumptions: string[] | null;
};

export type RecommendedCropEntry = {
  crop_id: string;
  crop_name: string;
  suitability: "high" | "medium" | "low";
  expected_yield_range: string;
  yield_min_t_ha: number | null;
  yield_max_t_ha: number | null;
  required_rainfall: string;
  preferred_soil: string[];
  risk_factors: string[];
  constraints: string[];
  recommendation: string;
};

export type RegionRecommendationsPayload = {
  region_id: string;
  region_name: string;
  agroecological_zone: string | null;
  soil_type: string | null;
  rainfall_mm: string;
  recommended_crops: RecommendedCropEntry[];
};

export const listCountries = async (): Promise<Country[]> => {
  const { data, error } = await supabase.from("countries").select("*").order("name_fr");
  if (error) throw error;
  return (data as Country[]) || [];
};

export const listRegions = async (countryId?: string): Promise<Region[]> => {
  let q = supabase.from("regions").select("*").order("name");
  if (countryId) q = q.eq("country_id", countryId);
  const { data, error } = await q;
  if (error) throw error;
  return (data as Region[]) || [];
};

export const listCrops = async (): Promise<CropProfile[]> => {
  const { data, error } = await supabase.from("crop_profiles").select("*").order("name_fr");
  if (error) throw error;
  return (data as CropProfile[]) || [];
};

export const getRegion = async (regionId: string): Promise<Region | null> => {
  const { data, error } = await supabase.from("regions").select("*").eq("id", regionId).maybeSingle();
  if (error) throw error;
  return data as Region | null;
};

export const getSoilProfile = async (soilType: string) => {
  const { data, error } = await supabase
    .from("soil_profiles")
    .select("*")
    .eq("soil_type", soilType)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const getCropRecommendations = async (regionId: string): Promise<RegionRecommendationsPayload> => {
  const region = await getRegion(regionId);
  if (!region) throw new Error("Region introuvable");

  const [{ data: recs, error: recErr }, { data: yields, error: yErr }, crops] = await Promise.all([
    supabase.from("crop_recommendations").select("*").eq("region_id", regionId),
    supabase.from("yield_estimates").select("*").eq("region_id", regionId),
    listCrops(),
  ]);
  if (recErr) throw recErr;
  if (yErr) throw yErr;

  const cropMap = new Map(crops.map((c) => [c.id, c]));
  const yieldMap = new Map((yields as YieldEstimate[]).map((y) => [y.crop_id, y]));

  const recommended_crops: RecommendedCropEntry[] = (recs as CropRecommendation[]).map((r) => {
    const c = cropMap.get(r.crop_id);
    const y = yieldMap.get(r.crop_id);
    return {
      crop_id: r.crop_id,
      crop_name: c?.name_fr || c?.crop_name || "—",
      suitability: r.suitability,
      expected_yield_range:
        y && y.yield_min_t_ha != null && y.yield_max_t_ha != null
          ? `${y.yield_min_t_ha}–${y.yield_max_t_ha} t/ha`
          : "n/d",
      yield_min_t_ha: y?.yield_min_t_ha ?? null,
      yield_max_t_ha: y?.yield_max_t_ha ?? null,
      required_rainfall:
        c?.water_need_mm_min != null && c?.water_need_mm_max != null
          ? `${c.water_need_mm_min}–${c.water_need_mm_max} mm`
          : "n/d",
      preferred_soil: c?.preferred_soil ?? [],
      risk_factors: c?.risk_factors ?? [],
      constraints: r.constraints ?? [],
      recommendation: r.recommendation_text ?? "",
    };
  });

  // sort: high > medium > low
  const order = { high: 0, medium: 1, low: 2 };
  recommended_crops.sort((a, b) => order[a.suitability] - order[b.suitability]);

  return {
    region_id: region.id,
    region_name: region.name,
    agroecological_zone: region.agroecological_zone,
    soil_type: region.dominant_soil_type,
    rainfall_mm:
      region.rainfall_min_mm != null && region.rainfall_max_mm != null
        ? `${region.rainfall_min_mm}–${region.rainfall_max_mm} mm/an`
        : "n/d",
    recommended_crops,
  };
};

export const getYieldEstimate = async (regionId: string, cropId: string): Promise<YieldEstimate | null> => {
  const { data, error } = await supabase
    .from("yield_estimates")
    .select("*")
    .eq("region_id", regionId)
    .eq("crop_id", cropId)
    .maybeSingle();
  if (error) throw error;
  return data as YieldEstimate | null;
};

export const saveRecommendation = async (regionId: string, cropId: string) => {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) throw new Error("Authentification requise");
  const { error } = await supabase
    .from("saved_recommendations")
    .insert({ user_id: userRes.user.id, region_id: regionId, crop_id: cropId });
  if (error && !error.message.includes("duplicate")) throw error;
};
