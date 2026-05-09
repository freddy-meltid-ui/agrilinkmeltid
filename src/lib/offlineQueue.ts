/**
 * Offline action queue for AgriGrid Atlas.
 * Queues writes (farmer_interests, field_sessions, ...) locally and syncs to
 * Supabase when online. Uses IndexedDB with a localStorage fallback.
 */

import { supabase } from "@/integrations/supabase/client";

export type QueuedActionType = "farmer_interest" | "field_session";
export type QueuedStatus = "pending" | "syncing" | "synced" | "failed";

export type QueuedAction = {
  id: string; // local UUID
  type: QueuedActionType;
  table: "farmer_interests" | "field_sessions";
  payload: Record<string, unknown>;
  status: QueuedStatus;
  attempts: number;
  last_error: string | null;
  created_at: string; // ISO
  synced_at: string | null;
  remote_id?: string | null;
};

const DB_NAME = "agrigrid_atlas_queue";
const DB_VERSION = 1;
const STORE = "queue";
const LS_PREFIX = "atlas:queue:";
const LS_INDEX = "atlas:queue:index";
const QUEUE_EVENT = "atlas-queue-changed";

const idbAvailable = () => typeof indexedDB !== "undefined" && !!indexedDB;
const uuid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const idbAll = async (): Promise<QueuedAction[]> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as QueuedAction[]) ?? []);
    req.onerror = () => reject(req.error);
  });
};
const idbPut = async (a: QueuedAction) => {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(a);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
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

// localStorage fallback
const lsIdx = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(LS_INDEX) || "[]");
  } catch {
    return [];
  }
};
const lsSetIdx = (ids: string[]) =>
  localStorage.setItem(LS_INDEX, JSON.stringify(Array.from(new Set(ids))));
const lsAll = (): QueuedAction[] =>
  lsIdx()
    .map((id) => {
      try {
        return JSON.parse(localStorage.getItem(LS_PREFIX + id) || "null") as QueuedAction | null;
      } catch {
        return null;
      }
    })
    .filter((x): x is QueuedAction => x !== null);
const lsPut = (a: QueuedAction) => {
  localStorage.setItem(LS_PREFIX + a.id, JSON.stringify(a));
  lsSetIdx([...lsIdx(), a.id]);
};
const lsDelete = (id: string) => {
  localStorage.removeItem(LS_PREFIX + id);
  lsSetIdx(lsIdx().filter((x) => x !== id));
};

const notifyChange = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(QUEUE_EVENT));
  }
};

// ─── Public API ──────────────────────────────────────────────────────────────

export const enqueueAction = async (
  type: QueuedActionType,
  payload: Record<string, unknown>
): Promise<QueuedAction> => {
  const action: QueuedAction = {
    id: uuid(),
    type,
    table: type === "farmer_interest" ? "farmer_interests" : "field_sessions",
    payload,
    status: "pending",
    attempts: 0,
    last_error: null,
    created_at: new Date().toISOString(),
    synced_at: null,
    remote_id: null,
  };
  if (idbAvailable()) {
    try {
      await idbPut(action);
    } catch {
      lsPut(action);
    }
  } else {
    lsPut(action);
  }
  notifyChange();
  return action;
};

export const listQueue = async (): Promise<QueuedAction[]> => {
  let items: QueuedAction[] = [];
  if (idbAvailable()) {
    try {
      items = await idbAll();
    } catch {
      items = lsAll();
    }
  } else {
    items = lsAll();
  }
  return items.sort((a, b) => b.created_at.localeCompare(a.created_at));
};

export const removeFromQueue = async (id: string) => {
  if (idbAvailable()) {
    try {
      await idbDelete(id);
    } catch {
      // ignore
    }
  }
  lsDelete(id);
  notifyChange();
};

const updateAction = async (a: QueuedAction) => {
  if (idbAvailable()) {
    try {
      await idbPut(a);
      notifyChange();
      return;
    } catch {
      // fall through
    }
  }
  lsPut(a);
  notifyChange();
};

/**
 * Try to sync a single queued action. Resolves to the updated action.
 */
export const syncAction = async (action: QueuedAction): Promise<QueuedAction> => {
  // Resolve user_id from current session
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    const updated: QueuedAction = {
      ...action,
      status: "failed",
      last_error: "Authentification requise",
      attempts: action.attempts + 1,
    };
    await updateAction(updated);
    return updated;
  }

  const syncing: QueuedAction = { ...action, status: "syncing" };
  await updateAction(syncing);

  try {
    const insertPayload = {
      ...action.payload,
      user_id: userRes.user.id,
    };
    const { data, error } = await supabase
      .from(action.table)
      .insert(insertPayload as never)
      .select("id")
      .single();
    if (error) throw error;
    const synced: QueuedAction = {
      ...action,
      status: "synced",
      synced_at: new Date().toISOString(),
      attempts: action.attempts + 1,
      last_error: null,
      remote_id: (data as { id: string } | null)?.id ?? null,
    };
    await updateAction(synced);
    return synced;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    const failed: QueuedAction = {
      ...action,
      status: "failed",
      last_error: msg,
      attempts: action.attempts + 1,
    };
    await updateAction(failed);
    return failed;
  }
};

/**
 * Sync all pending or failed actions. Returns counts.
 */
export const syncAll = async (): Promise<{ synced: number; failed: number }> => {
  const items = await listQueue();
  let synced = 0;
  let failed = 0;
  for (const it of items) {
    if (it.status === "synced") continue;
    const result = await syncAction(it);
    if (result.status === "synced") synced++;
    else failed++;
  }
  return { synced, failed };
};

export const subscribeQueue = (cb: () => void): (() => void) => {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => cb();
  window.addEventListener(QUEUE_EVENT, handler);
  return () => window.removeEventListener(QUEUE_EVENT, handler);
};

export const QUEUE_CHANGE_EVENT = QUEUE_EVENT;
