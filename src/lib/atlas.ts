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

// ─────────────────────────────────────────────────────────────────────────────
// Atlas intelligence types
// ─────────────────────────────────────────────────────────────────────────────

export type RainfallProfile = {
  id: string;
  region_id: string;
  annual_avg_mm: number | null;
  monthly_avg_json: Record<string, number> | null;
  rainy_season_start: string | null;
  rainy_season_end: string | null;
  dry_months: string[] | null;
  source: string | null;
  confidence: "low" | "medium" | "high" | null;
};

export type SeasonalityProfile = {
  id: string;
  region_id: string;
  crop_id: string;
  planting_window_start: string | null;
  planting_window_end: string | null;
  harvest_window_start: string | null;
  harvest_window_end: string | null;
  season_fit_score: number | null;
  notes: string | null;
  source: string | null;
};

export type RecommendationScore = {
  id: string;
  region_id: string;
  crop_id: string;
  soil_score: number | null;
  rainfall_score: number | null;
  seasonality_score: number | null;
  yield_score: number | null;
  market_score: number | null;
  risk_score: number | null;
  final_score: number | null;
  confidence: "low" | "medium" | "high" | null;
  explanation_json: {
    why_crop?: string;
    why_region?: string;
    why_season?: string;
    uncertainties?: string[];
    [k: string]: unknown;
  } | null;
  source_version: string | null;
};

export type CropPrice = {
  id: string;
  crop_name: string;
  price: number;
  currency: string;
  unit: string;
  market_name: string;
  country: string;
  city: string | null;
  recorded_at: string;
  source: string | null;
};

export type DemandSignal = {
  id: string;
  crop_name: string;
  country: string;
  city: string | null;
  listing_count: number;
  buyer_count: number;
  demand_level: "low" | "medium" | "high" | string;
  recorded_at: string;
};

export type RegionAtlasIntelligence = {
  region: Region | null;
  rainfall: RainfallProfile | null;
  recommendations: CropRecommendation[];
  yields: YieldEstimate[];
  scores: RecommendationScore[];
  seasonality: SeasonalityProfile[];
};

export type MarketContext = {
  latest_price: CropPrice | null;
  prices: CropPrice[];
  demand: DemandSignal | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// New fetchers
// ─────────────────────────────────────────────────────────────────────────────

export const getRainfallProfile = async (regionId: string): Promise<RainfallProfile | null> => {
  const { data, error } = await supabase
    .from("rainfall_profiles")
    .select("*")
    .eq("region_id", regionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as RainfallProfile) ?? null;
};

export const getSeasonalityProfile = async (
  regionId: string,
  cropId: string
): Promise<SeasonalityProfile | null> => {
  const { data, error } = await supabase
    .from("seasonality_profiles")
    .select("*")
    .eq("region_id", regionId)
    .eq("crop_id", cropId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as SeasonalityProfile) ?? null;
};

export const getRecommendationScore = async (
  regionId: string,
  cropId: string
): Promise<RecommendationScore | null> => {
  const { data, error } = await supabase
    .from("recommendation_scores")
    .select("*")
    .eq("region_id", regionId)
    .eq("crop_id", cropId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as RecommendationScore) ?? null;
};

export const getRegionAtlasIntelligence = async (
  regionId: string
): Promise<RegionAtlasIntelligence> => {
  const [region, rainfallRes, recsRes, yieldsRes, scoresRes, seasonRes] = await Promise.all([
    getRegion(regionId),
    supabase
      .from("rainfall_profiles")
      .select("*")
      .eq("region_id", regionId)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase.from("crop_recommendations").select("*").eq("region_id", regionId),
    supabase.from("yield_estimates").select("*").eq("region_id", regionId),
    supabase.from("recommendation_scores").select("*").eq("region_id", regionId),
    supabase.from("seasonality_profiles").select("*").eq("region_id", regionId),
  ]);

  if (rainfallRes.error) throw rainfallRes.error;
  if (recsRes.error) throw recsRes.error;
  if (yieldsRes.error) throw yieldsRes.error;
  if (scoresRes.error) throw scoresRes.error;
  if (seasonRes.error) throw seasonRes.error;

  return {
    region,
    rainfall: ((rainfallRes.data ?? [])[0] as unknown as RainfallProfile) ?? null,
    recommendations: (recsRes.data as CropRecommendation[]) ?? [],
    yields: (yieldsRes.data as YieldEstimate[]) ?? [],
    scores: (scoresRes.data as unknown as RecommendationScore[]) ?? [],
    seasonality: (seasonRes.data as unknown as SeasonalityProfile[]) ?? [],
  };
};

export const getMarketContext = async (
  cropName: string,
  country?: string
): Promise<MarketContext> => {
  let priceQ = supabase
    .from("crop_prices")
    .select("*")
    .ilike("crop_name", cropName)
    .order("recorded_at", { ascending: false })
    .limit(20);
  if (country) priceQ = priceQ.eq("country", country);

  let demandQ = supabase
    .from("demand_signals")
    .select("*")
    .ilike("crop_name", cropName)
    .order("recorded_at", { ascending: false })
    .limit(1);
  if (country) demandQ = demandQ.eq("country", country);

  const [priceRes, demandRes] = await Promise.all([priceQ, demandQ]);
  if (priceRes.error) throw priceRes.error;
  if (demandRes.error) throw demandRes.error;

  const prices = (priceRes.data as CropPrice[]) ?? [];
  const demandRows = (demandRes.data as unknown as DemandSignal[]) ?? [];

  return {
    latest_price: prices[0] ?? null,
    prices,
    demand: demandRows[0] ?? null,
  };
};
