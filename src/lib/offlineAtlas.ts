/**
 * Offline-first storage for AgriGrid Atlas structured data.
 * Uses IndexedDB when available, with a localStorage fallback.
 *
 * One record per region keyed by `region_id` (string).
 * The payload is intentionally serializable JSON so it can move between backends.
 */

import type { BeninRegion } from "@/lib/beninRegions";
import type {
  Region,
  RainfallProfile,
  CropRecommendation,
  RecommendationScore,
  YieldEstimate,
  SeasonalityProfile,
} from "@/lib/atlas";

export type OfflineRegionPayload = {
  region_id: string;
  region_name: string;
  country?: string;
  // Static fallback (used when supabase data is not available)
  static_region: BeninRegion | null;
  // Optional Supabase intelligence
  region_profile: Region | null;
  rainfall: RainfallProfile | null;
  recommendations: CropRecommendation[];
  scores: RecommendationScore[];
  yields: YieldEstimate[];
  seasonality: SeasonalityProfile[];
  // Metadata
  synced_at: string; // ISO timestamp
  version: number;
};

const DB_NAME = "agrigrid_atlas";
const DB_VERSION = 1;
const STORE = "regions";
const LS_PREFIX = "atlas:offline:";
const LS_INDEX = "atlas:offline:index";
const PAYLOAD_VERSION = 1;

// ─── IndexedDB helpers ──────────────────────────────────────────────────────

const idbAvailable = (): boolean =>
  typeof indexedDB !== "undefined" && !!indexedDB;

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "region_id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const idbPut = async (payload: OfflineRegionPayload) => {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(payload);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const idbGet = async (id: string): Promise<OfflineRegionPayload | null> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as OfflineRegionPayload) ?? null);
    req.onerror = () => reject(req.error);
  });
};

const idbList = async (): Promise<OfflineRegionPayload[]> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as OfflineRegionPayload[]) ?? []);
    req.onerror = () => reject(req.error);
  });
};

const idbDelete = async (id: string) => {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// ─── localStorage fallback ───────────────────────────────────────────────────

const lsIndex = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(LS_INDEX) || "[]");
  } catch {
    return [];
  }
};
const lsSetIndex = (ids: string[]) => {
  localStorage.setItem(LS_INDEX, JSON.stringify(Array.from(new Set(ids))));
};
const lsPut = (p: OfflineRegionPayload) => {
  localStorage.setItem(LS_PREFIX + p.region_id, JSON.stringify(p));
  lsSetIndex([...lsIndex(), p.region_id]);
};
const lsGet = (id: string): OfflineRegionPayload | null => {
  try {
    const raw = localStorage.getItem(LS_PREFIX + id);
    return raw ? (JSON.parse(raw) as OfflineRegionPayload) : null;
  } catch {
    return null;
  }
};
const lsList = (): OfflineRegionPayload[] =>
  lsIndex()
    .map((id) => lsGet(id))
    .filter((x): x is OfflineRegionPayload => x !== null);
const lsDelete = (id: string) => {
  localStorage.removeItem(LS_PREFIX + id);
  lsSetIndex(lsIndex().filter((x) => x !== id));
};

// ─── Public API ──────────────────────────────────────────────────────────────

export const saveOfflineRegion = async (
  payload: Omit<OfflineRegionPayload, "synced_at" | "version">
): Promise<OfflineRegionPayload> => {
  const full: OfflineRegionPayload = {
    ...payload,
    synced_at: new Date().toISOString(),
    version: PAYLOAD_VERSION,
  };
  if (idbAvailable()) {
    try {
      await idbPut(full);
      return full;
    } catch {
      // fall through to localStorage
    }
  }
  lsPut(full);
  return full;
};

export const getOfflineRegion = async (
  id: string
): Promise<OfflineRegionPayload | null> => {
  if (idbAvailable()) {
    try {
      const v = await idbGet(id);
      if (v) return v;
    } catch {
      // fall through
    }
  }
  return lsGet(id);
};

export const listOfflineRegions = async (): Promise<OfflineRegionPayload[]> => {
  if (idbAvailable()) {
    try {
      const v = await idbList();
      if (v.length > 0) return v.sort((a, b) => b.synced_at.localeCompare(a.synced_at));
    } catch {
      // fall through
    }
  }
  return lsList().sort((a, b) => b.synced_at.localeCompare(a.synced_at));
};

export const removeOfflineRegion = async (id: string): Promise<void> => {
  if (idbAvailable()) {
    try {
      await idbDelete(id);
    } catch {
      // ignore
    }
  }
  lsDelete(id);
};

export const isRegionOffline = async (id: string): Promise<boolean> => {
  const v = await getOfflineRegion(id);
  return v !== null;
};

/**
 * Build an OfflineRegionPayload from a static BeninRegion plus (optionally) any
 * Supabase intelligence already loaded for it. Designed to be small + safe.
 */
export const buildPayloadFromStatic = (
  region: BeninRegion,
  intelligence?: {
    region_profile?: Region | null;
    rainfall?: RainfallProfile | null;
    recommendations?: CropRecommendation[];
    scores?: RecommendationScore[];
    yields?: YieldEstimate[];
    seasonality?: SeasonalityProfile[];
  }
): Omit<OfflineRegionPayload, "synced_at" | "version"> => ({
  region_id: region.id,
  region_name: region.name,
  country: region.country,
  static_region: region,
  region_profile: intelligence?.region_profile ?? null,
  rainfall: intelligence?.rainfall ?? null,
  recommendations: intelligence?.recommendations ?? [],
  scores: intelligence?.scores ?? [],
  yields: intelligence?.yields ?? [],
  seasonality: intelligence?.seasonality ?? [],
});
