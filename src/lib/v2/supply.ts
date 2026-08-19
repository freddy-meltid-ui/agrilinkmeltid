// AGRI-GRID V2 — supply domain data access
// Supplier > Farm > Parcel > Crop cycle > Harvest forecast > Available supply
// All of this is Agri-Grid *internal* network data. Processor organisations get
// no read access at database level in this phase.
import { supabase } from "@/integrations/supabase/client";
import { computeFreshness, FreshnessStatus, supplyReferenceDate } from "./freshness";

export type SupplierType = "individual_farmer" | "cooperative" | "producer_group" | "aggregator";
export type SupplierStatus = "unverified" | "field_verified" | "update_required" | "inactive";
export type CropCycleStatus = "planned" | "growing" | "harvest_approaching" | "harvesting" | "completed" | "cancelled";
export type SupplyStatus = "forecast" | "expected" | "available" | "reserved" | "sold" | "expired" | "withdrawn";
export type VisitType =
  | "registration"
  | "data_update"
  | "crop_monitoring"
  | "harvest_forecast"
  | "supply_confirmation"
  | "quality_check"
  | "other";

export type Supplier = {
  id: string;
  supplier_code: string;
  supplier_type: SupplierType;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  phone_secondary: string | null;
  preferred_language: string;
  country: string;
  department: string | null;
  commune: string | null;
  arrondissement: string | null;
  village: string | null;
  latitude: number | null;
  longitude: number | null;
  affiliation: string | null;
  status: SupplierStatus;
  is_active: boolean;
  notes: string | null;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Farm = {
  id: string;
  supplier_id: string;
  name: string;
  department: string | null;
  commune: string | null;
  arrondissement: string | null;
  village: string | null;
  latitude: number | null;
  longitude: number | null;
  total_area: number | null;
  area_unit: string;
  accessibility_notes: string | null;
  is_active: boolean;
};

export type Parcel = {
  id: string;
  farm_id: string;
  supplier_id: string;
  reference: string;
  area: number | null;
  area_unit: string;
  latitude: number | null;
  longitude: number | null;
  boundary_geojson: unknown | null;
  irrigation_status: string | null;
  notes: string | null;
};

export type CropCycle = {
  id: string;
  parcel_id: string;
  supplier_id: string;
  crop_id: string;
  variety_id: string | null;
  planting_date: string | null;
  expected_harvest_start: string | null;
  expected_harvest_end: string | null;
  cultivated_area: number | null;
  area_unit: string;
  estimated_yield: number | null;
  yield_unit: string;
  production_practice: string | null;
  status: CropCycleStatus;
  notes: string | null;
  created_at: string;
};

export type HarvestForecast = {
  id: string;
  crop_cycle_id: string;
  supplier_id: string;
  forecast_date: string;
  expected_harvest_start: string | null;
  expected_harvest_end: string | null;
  estimated_quantity: number;
  unit_code: string;
  confidence: "low" | "medium" | "high";
  observation: string | null;
  source: string;
  created_at: string;
};

export type SupplyAvailability = {
  id: string;
  supplier_id: string;
  crop_cycle_id: string | null;
  crop_id: string;
  variety_id: string | null;
  quantity_available: number;
  unit_code: string;
  availability_start: string | null;
  availability_end: string | null;
  asking_price: number | null;
  price_unit: string | null;
  quality_grade: string | null;
  certification_status: string | null;
  status: SupplyStatus;
  last_confirmed_at: string | null;
  source: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type FieldVisit = {
  id: string;
  supplier_id: string;
  farm_id: string | null;
  field_agent_id: string | null;
  visit_date: string;
  visit_type: VisitType;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  photos: unknown;
  actions_performed: string[];
  next_visit_date: string | null;
  created_at: string;
};

export type FieldAgent = {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  country: string;
  assigned_areas: string[];
  status: string;
};

export type SupplierBundle = {
  supplier: Supplier | null;
  farms: Farm[];
  parcels: Parcel[];
  cycles: CropCycle[];
  forecasts: HarvestForecast[];
  supplies: SupplyAvailability[];
  visits: FieldVisit[];
};

export const EMPTY_BUNDLE: SupplierBundle = {
  supplier: null,
  farms: [],
  parcels: [],
  cycles: [],
  forecasts: [],
  supplies: [],
  visits: [],
};

// ---------------------------------------------------------------- field agent

export async function fetchFieldAgent(userId: string): Promise<FieldAgent | null> {
  const { data } = await supabase.from("v2_field_agents").select("*").eq("user_id", userId).maybeSingle();
  return (data as FieldAgent) ?? null;
}

export async function isAgrigridAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase.rpc("v2_is_agrigrid_admin", { _user_id: userId });
  return Boolean(data);
}

// ---------------------------------------------------------------- suppliers

export async function fetchSuppliers(search?: string): Promise<Supplier[]> {
  let query = supabase.from("v2_suppliers").select("*").order("display_name");
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(
      `display_name.ilike.${term},phone.ilike.${term},village.ilike.${term},commune.ilike.${term},supplier_code.ilike.${term}`,
    );
  }
  const { data } = await query;
  return (data as Supplier[]) ?? [];
}

export async function fetchSupplierBundle(supplierId: string): Promise<SupplierBundle> {
  const [supplier, farms, parcels, cycles, forecasts, supplies, visits] = await Promise.all([
    supabase.from("v2_suppliers").select("*").eq("id", supplierId).maybeSingle(),
    supabase.from("v2_farms").select("*").eq("supplier_id", supplierId).order("created_at"),
    supabase.from("v2_farm_parcels").select("*").eq("supplier_id", supplierId).order("created_at"),
    supabase.from("v2_crop_cycles").select("*").eq("supplier_id", supplierId).order("created_at", { ascending: false }),
    supabase
      .from("v2_harvest_forecasts")
      .select("*")
      .eq("supplier_id", supplierId)
      .order("forecast_date", { ascending: false }),
    supabase.from("v2_supply_availability").select("*").eq("supplier_id", supplierId).order("created_at", { ascending: false }),
    supabase.from("v2_field_visits").select("*").eq("supplier_id", supplierId).order("visit_date", { ascending: false }),
  ]);

  return {
    supplier: (supplier.data as Supplier) ?? null,
    farms: (farms.data as Farm[]) ?? [],
    parcels: (parcels.data as Parcel[]) ?? [],
    cycles: (cycles.data as CropCycle[]) ?? [],
    forecasts: (forecasts.data as HarvestForecast[]) ?? [],
    supplies: (supplies.data as SupplyAvailability[]) ?? [],
    visits: (visits.data as FieldVisit[]) ?? [],
  };
}

// ---------------------------------------------------------------- mutations

export type RegisterSupplierInput = {
  identity: {
    display_name: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    phone_secondary?: string;
    preferred_language: string;
    affiliation?: string;
    supplier_type: SupplierType;
    department?: string;
    commune?: string;
    arrondissement?: string;
    village?: string;
  };
  location: { latitude?: number | null; longitude?: number | null };
  farm: {
    name: string;
    total_area?: number | null;
    area_unit: string;
    latitude?: number | null;
    longitude?: number | null;
    accessibility_notes?: string;
  };
  parcel: { reference: string; area?: number | null; area_unit: string; irrigation_status?: string };
  production: {
    crop_id: string;
    variety_id?: string | null;
    status: CropCycleStatus;
    expected_harvest_start?: string | null;
    expected_harvest_end?: string | null;
    estimated_quantity?: number | null;
    unit_code: string;
  };
  evidence: { notes?: string; photos?: string[] };
  agentId?: string | null;
};

export async function registerSupplier(input: RegisterSupplierInput) {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) throw new Error("not authenticated");

  const { data: supplier, error: supErr } = await supabase
    .from("v2_suppliers")
    .insert({
      supplier_type: input.identity.supplier_type,
      display_name: input.identity.display_name,
      first_name: input.identity.first_name || null,
      last_name: input.identity.last_name || null,
      phone: input.identity.phone || null,
      phone_secondary: input.identity.phone_secondary || null,
      preferred_language: input.identity.preferred_language,
      affiliation: input.identity.affiliation || null,
      department: input.identity.department || null,
      commune: input.identity.commune || null,
      arrondissement: input.identity.arrondissement || null,
      village: input.identity.village || null,
      latitude: input.location.latitude ?? null,
      longitude: input.location.longitude ?? null,
      status: "field_verified",
      last_verified_at: new Date().toISOString(),
      notes: input.evidence.notes || null,
      created_by: uid,
    })
    .select()
    .single();
  if (supErr) throw supErr;

  const supplierId = (supplier as Supplier).id;

  // Assignment is admin-managed; a non-admin agent keeps access through created_by.
  if (input.agentId) {
    await supabase
      .from("v2_supplier_assignments")
      .insert({ supplier_id: supplierId, field_agent_id: input.agentId, assigned_by: uid });
  }

  const { data: farm, error: farmErr } = await supabase
    .from("v2_farms")
    .insert({
      supplier_id: supplierId,
      name: input.farm.name || `Ferme ${input.identity.display_name}`,
      department: input.identity.department || null,
      commune: input.identity.commune || null,
      arrondissement: input.identity.arrondissement || null,
      village: input.identity.village || null,
      latitude: input.farm.latitude ?? input.location.latitude ?? null,
      longitude: input.farm.longitude ?? input.location.longitude ?? null,
      total_area: input.farm.total_area ?? null,
      area_unit: input.farm.area_unit,
      accessibility_notes: input.farm.accessibility_notes || null,
      created_by: uid,
    })
    .select()
    .single();
  if (farmErr) throw farmErr;

  const { data: parcel, error: parcelErr } = await supabase
    .from("v2_farm_parcels")
    .insert({
      farm_id: (farm as Farm).id,
      supplier_id: supplierId,
      reference: input.parcel.reference || "Parcelle A",
      area: input.parcel.area ?? null,
      area_unit: input.parcel.area_unit,
      latitude: input.farm.latitude ?? input.location.latitude ?? null,
      longitude: input.farm.longitude ?? input.location.longitude ?? null,
      irrigation_status: input.parcel.irrigation_status || null,
      created_by: uid,
    })
    .select()
    .single();
  if (parcelErr) throw parcelErr;

  const { data: cycle, error: cycleErr } = await supabase
    .from("v2_crop_cycles")
    .insert({
      parcel_id: (parcel as Parcel).id,
      supplier_id: supplierId,
      crop_id: input.production.crop_id,
      variety_id: input.production.variety_id || null,
      expected_harvest_start: input.production.expected_harvest_start || null,
      expected_harvest_end: input.production.expected_harvest_end || null,
      cultivated_area: input.parcel.area ?? null,
      area_unit: input.parcel.area_unit,
      estimated_yield: input.production.estimated_quantity ?? null,
      yield_unit: input.production.unit_code,
      status: input.production.status,
      created_by: uid,
    })
    .select()
    .single();
  if (cycleErr) throw cycleErr;

  const { data: visit } = await supabase
    .from("v2_field_visits")
    .insert({
      supplier_id: supplierId,
      farm_id: (farm as Farm).id,
      field_agent_id: input.agentId ?? null,
      visit_type: "registration",
      latitude: input.location.latitude ?? null,
      longitude: input.location.longitude ?? null,
      notes: input.evidence.notes || null,
      photos: input.evidence.photos ?? [],
      actions_performed: ["registration", "harvest_forecast"],
      created_by: uid,
    })
    .select()
    .single();

  if (input.production.estimated_quantity) {
    await addHarvestForecast({
      crop_cycle_id: (cycle as CropCycle).id,
      supplier_id: supplierId,
      estimated_quantity: input.production.estimated_quantity,
      unit_code: input.production.unit_code,
      expected_harvest_start: input.production.expected_harvest_start ?? null,
      expected_harvest_end: input.production.expected_harvest_end ?? null,
      confidence: "medium",
      observation: "Estimation initiale (enregistrement)",
      field_visit_id: (visit as FieldVisit | null)?.id ?? null,
    });
  }

  return { supplierId, farmId: (farm as Farm).id, parcelId: (parcel as Parcel).id, cycleId: (cycle as CropCycle).id };
}

export type NewForecast = {
  crop_cycle_id: string;
  supplier_id: string;
  estimated_quantity: number;
  unit_code: string;
  expected_harvest_start?: string | null;
  expected_harvest_end?: string | null;
  confidence?: "low" | "medium" | "high";
  observation?: string | null;
  field_visit_id?: string | null;
};

/** Forecasts are append-only: history is never overwritten. */
export async function addHarvestForecast(input: NewForecast) {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  const { error } = await supabase.from("v2_harvest_forecasts").insert({
    crop_cycle_id: input.crop_cycle_id,
    supplier_id: input.supplier_id,
    estimated_quantity: input.estimated_quantity,
    unit_code: input.unit_code,
    expected_harvest_start: input.expected_harvest_start ?? null,
    expected_harvest_end: input.expected_harvest_end ?? null,
    confidence: input.confidence ?? "medium",
    observation: input.observation ?? null,
    field_visit_id: input.field_visit_id ?? null,
    captured_by: uid,
  });
  if (error) throw error;
}

export async function upsertSupplyAvailability(record: Partial<SupplyAvailability> & { supplier_id: string; crop_id: string; quantity_available: number }) {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  const payload = {
    ...record,
    unit_code: record.unit_code ?? "t",
    last_confirmed_at: new Date().toISOString(),
    confirmed_by: uid,
    created_by: uid,
  };
  if (record.id) {
    const { id, ...rest } = payload;
    const { error } = await supabase
      .from("v2_supply_availability")
      .update(rest as Partial<SupplyAvailability>)
      .eq("id", record.id);
    if (error) throw error;
    return record.id;
  }
  const { data, error } = await supabase.from("v2_supply_availability").insert(payload).select("id").single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function confirmSupply(id: string, quantity?: number, status?: SupplyStatus) {
  const { data: userRes } = await supabase.auth.getUser();
  const patch: Partial<SupplyAvailability> & { confirmed_by?: string } = {
    last_confirmed_at: new Date().toISOString(),
    confirmed_by: userRes.user?.id,
  };
  if (typeof quantity === "number") patch.quantity_available = quantity;
  if (status) patch.status = status;
  const { error } = await supabase.from("v2_supply_availability").update(patch).eq("id", id);

  if (error) throw error;
}

export async function updateSupplier(id: string, patch: Partial<Supplier>) {
  const { error } = await supabase.from("v2_suppliers").update(patch).eq("id", id);
  if (error) throw error;
}

export async function updateFarm(id: string, patch: Partial<Farm>) {
  const { error } = await supabase.from("v2_farms").update(patch).eq("id", id);
  if (error) throw error;
}

export async function addCropCycle(input: {
  parcel_id: string;
  supplier_id: string;
  crop_id: string;
  variety_id?: string | null;
  planting_date?: string | null;
  expected_harvest_start?: string | null;
  expected_harvest_end?: string | null;
  cultivated_area?: number | null;
  area_unit?: string;
  estimated_yield?: number | null;
  yield_unit?: string;
  status?: CropCycleStatus;
}) {
  const { data: userRes } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("v2_crop_cycles")
    .insert({
      ...input,
      area_unit: input.area_unit ?? "ha",
      yield_unit: input.yield_unit ?? "t",
      status: input.status ?? "planned",
      created_by: userRes.user?.id,
    })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function addFieldVisit(input: {
  supplier_id: string;
  farm_id?: string | null;
  field_agent_id?: string | null;
  visit_type: VisitType;
  visit_date?: string;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  photos?: string[];
  actions_performed?: string[];
  next_visit_date?: string | null;
}) {
  const { data: userRes } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("v2_field_visits")
    .insert({
      ...input,
      photos: input.photos ?? [],
      actions_performed: input.actions_performed ?? [],
      created_by: userRes.user?.id,
    })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

// ---------------------------------------------------------------- aggregates

export type SupplyPoint = {
  supply_id: string;
  supplier_id: string;
  supplier_code: string;
  latitude: number | null;
  longitude: number | null;
  crop_id: string;
  variety_id: string | null;
  quantity_available: number;
  unit_code: string;
  forecast_quantity: number | null;
  availability_start: string | null;
  availability_end: string | null;
  status: SupplyStatus;
  last_confirmed_at: string | null;
  freshness: FreshnessStatus;
  freshness_days: number | null;
};

/**
 * Atlas-ready supply dataset (Phase 1C will consume this).
 * Deliberately excludes private supplier identity: no name, phone or notes.
 */
export async function fetchSupplyPoints(): Promise<SupplyPoint[]> {
  const { data } = await supabase
    .from("v2_supply_availability")
    .select(
      "id, supplier_id, crop_id, variety_id, quantity_available, unit_code, availability_start, availability_end, status, last_confirmed_at, updated_at, created_at, crop_cycle_id, v2_suppliers!inner(supplier_code, latitude, longitude)",
    )
    .order("created_at", { ascending: false });

  const rows = (data as unknown as Array<Record<string, any>>) ?? [];
  const cycleIds = rows.map((r) => r.crop_cycle_id).filter(Boolean);
  const latestByCycle = new Map<string, number>();
  if (cycleIds.length) {
    const { data: fc } = await supabase
      .from("v2_harvest_forecasts")
      .select("crop_cycle_id, estimated_quantity, forecast_date")
      .in("crop_cycle_id", cycleIds)
      .order("forecast_date", { ascending: false });
    for (const row of (fc as Array<{ crop_cycle_id: string; estimated_quantity: number }>) ?? []) {
      if (!latestByCycle.has(row.crop_cycle_id)) latestByCycle.set(row.crop_cycle_id, Number(row.estimated_quantity));
    }
  }

  return rows.map((r) => {
    const { status, days } = computeFreshness(supplyReferenceDate(r as any));
    return {
      supply_id: r.id,
      supplier_id: r.supplier_id,
      supplier_code: r.v2_suppliers?.supplier_code ?? "",
      latitude: r.v2_suppliers?.latitude ?? null,
      longitude: r.v2_suppliers?.longitude ?? null,
      crop_id: r.crop_id,
      variety_id: r.variety_id,
      quantity_available: Number(r.quantity_available),
      unit_code: r.unit_code,
      forecast_quantity: r.crop_cycle_id ? latestByCycle.get(r.crop_cycle_id) ?? null : null,
      availability_start: r.availability_start,
      availability_end: r.availability_end,
      status: r.status,
      last_confirmed_at: r.last_confirmed_at,
      freshness: status,
      freshness_days: days,
    } satisfies SupplyPoint;
  });
}

export type AgentWorkspace = {
  suppliers: Supplier[];
  supplies: SupplyAvailability[];
  cycles: CropCycle[];
  visits: FieldVisit[];
};

export async function fetchAgentWorkspace(): Promise<AgentWorkspace> {
  const [suppliers, supplies, cycles, visits] = await Promise.all([
    supabase.from("v2_suppliers").select("*").order("display_name"),
    supabase.from("v2_supply_availability").select("*").order("updated_at", { ascending: false }),
    supabase.from("v2_crop_cycles").select("*"),
    supabase.from("v2_field_visits").select("*").order("visit_date", { ascending: false }).limit(50),
  ]);
  return {
    suppliers: (suppliers.data as Supplier[]) ?? [],
    supplies: (supplies.data as SupplyAvailability[]) ?? [],
    cycles: (cycles.data as CropCycle[]) ?? [],
    visits: (visits.data as FieldVisit[]) ?? [],
  };
}

export function daysUntil(date?: string | null): number | null {
  if (!date) return null;
  const ts = new Date(date).getTime();
  if (Number.isNaN(ts)) return null;
  return Math.ceil((ts - Date.now()) / 86_400_000);
}
