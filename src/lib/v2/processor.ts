// AGRI-GRID V2 — processor foundation data access & helpers
import { supabase } from "@/integrations/supabase/client";

export type ProcessorProfile = {
  id: string;
  organization_id: string;
  trade_name: string | null;
  legal_form: string | null;
  rccm: string | null;
  ifu: string | null;
  year_established: number | null;
  business_phone: string | null;
  business_email: string | null;
  value_chains: string[];
  employees_count: number | null;
  challenges: string[];
  onboarding_step: number;
  onboarding_completed: boolean;
};

export type Facility = {
  id: string;
  organization_id: string;
  name: string;
  department: string | null;
  commune: string | null;
  arrondissement: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  processing_capacity_value: number | null;
  processing_capacity_unit: string | null;
  processing_capacity_period: string | null;
  is_main: boolean;
};

export type ProcessedProduct = {
  id: string;
  organization_id: string;
  facility_id: string | null;
  product_name: string;
  value_chain: string | null;
  production_capacity_value: number | null;
  production_capacity_unit: string | null;
  production_capacity_period: string | null;
};

export type RawMaterialNeed = {
  id: string;
  organization_id: string;
  facility_id: string | null;
  crop: string;
  variety: string | null;
  quality_preference: string | null;
  quantity: number | null;
  unit: string;
  frequency: string;
  sourcing_season: string | null;
  sourcing_radius_km: number | null;
  preferred_delivery_min: number | null;
  preferred_delivery_max: number | null;
  delivery_area: string | null;
};

export type ProcessorBundle = {
  profile: ProcessorProfile | null;
  facilities: Facility[];
  products: ProcessedProduct[];
  needs: RawMaterialNeed[];
};

/** Reference values kept generic so cashew and other value chains fit later. */
export const VALUE_CHAINS = [
  "ananas",
  "anacarde",
  "manioc",
  "mais",
  "soja",
  "karite",
  "riz",
  "tomate",
  "palmier",
  "autre",
];

export const LEGAL_FORMS = ["SARL", "SA", "SAS", "GIE", "Cooperative", "Entreprise individuelle", "ONG", "Autre"];

export const UNITS = ["kg", "tonnes", "sacs", "litres"];
export const FREQUENCIES = ["weekly", "biweekly", "monthly", "quarterly", "seasonal"];
export const CAPACITY_PERIODS = ["day", "week", "month", "year"];

export const CHALLENGES = [
  "raw_material_sourcing",
  "unstable_supply",
  "high_prices",
  "quality_inconsistency",
  "inventory_management",
  "production_tracking",
  "financial_management",
  "access_to_finance",
  "certification",
  "market_access",
];

export const BENIN_DEPARTMENTS = [
  "Alibori",
  "Atacora",
  "Atlantique",
  "Borgou",
  "Collines",
  "Couffo",
  "Donga",
  "Littoral",
  "Mono",
  "Ouémé",
  "Plateau",
  "Zou",
];

export async function fetchProcessorBundle(organizationId: string): Promise<ProcessorBundle> {
  const [profileRes, facilitiesRes, productsRes, needsRes] = await Promise.all([
    supabase.from("v2_processor_profiles").select("*").eq("organization_id", organizationId).maybeSingle(),
    supabase
      .from("v2_processing_facilities")
      .select("*")
      .eq("organization_id", organizationId)
      .order("is_main", { ascending: false }),
    supabase.from("v2_processed_products").select("*").eq("organization_id", organizationId).order("created_at"),
    supabase.from("v2_raw_material_needs").select("*").eq("organization_id", organizationId).order("created_at"),
  ]);

  return {
    profile: (profileRes.data as ProcessorProfile | null) ?? null,
    facilities: (facilitiesRes.data as Facility[]) ?? [],
    products: (productsRes.data as ProcessedProduct[]) ?? [],
    needs: (needsRes.data as RawMaterialNeed[]) ?? [],
  };
}

/** Normalises a recurring need to a monthly tonnage so the dashboard can total them. */
export function monthlyTonnes(need: RawMaterialNeed): number {
  if (!need.quantity) return 0;
  const inTonnes = need.unit === "kg" ? need.quantity / 1000 : need.unit === "tonnes" ? need.quantity : 0;
  const perMonth: Record<string, number> = {
    weekly: 4.33,
    biweekly: 2.17,
    monthly: 1,
    quarterly: 1 / 3,
    seasonal: 1 / 6,
  };
  return inTonnes * (perMonth[need.frequency] ?? 1);
}

export function totalMonthlyTonnes(needs: RawMaterialNeed[]): number {
  return Math.round(needs.reduce((sum, n) => sum + monthlyTonnes(n), 0) * 10) / 10;
}

/** Profile completeness, 0-100, based on the five onboarding blocks. */
export function completeness(bundle: ProcessorBundle): number {
  const p = bundle.profile;
  const checks: boolean[] = [
    !!p?.trade_name,
    !!p?.legal_form,
    !!p?.business_phone || !!p?.business_email,
    !!p?.year_established,
    bundle.facilities.length > 0,
    !!bundle.facilities[0]?.department && !!bundle.facilities[0]?.commune,
    !!bundle.facilities[0]?.processing_capacity_value,
    (p?.value_chains?.length ?? 0) > 0,
    bundle.products.length > 0,
    !!p?.employees_count,
    bundle.needs.length > 0,
    (p?.challenges?.length ?? 0) > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
