// AGRI-GRID V2 — synchronisation abstraction for field-data mutations.
//
// STATUS: Phase 1B ships ONLINE-ONLY. No offline queueing is active here and
// nothing is simulated. Every field mutation goes through `runFieldMutation`
// so that a future offline queue (see src/lib/offlineQueue.ts used by Atlas V1)
// can be plugged in at a single place.
//
// Operations that will need offline queueing later are tagged below.
import { toast } from "sonner";

export type FieldOperation =
  | "supplier.register"
  | "supplier.update"
  | "farm.update"
  | "cropCycle.create"
  | "harvestForecast.create"
  | "supply.upsert"
  | "supply.confirm"
  | "visit.create"
  | "evidence.upload";

/** Operations that must be queued when full offline mode is implemented. */
export const OFFLINE_CANDIDATE_OPERATIONS: FieldOperation[] = [
  "supplier.register",
  "supplier.update",
  "farm.update",
  "cropCycle.create",
  "harvestForecast.create",
  "supply.upsert",
  "supply.confirm",
  "visit.create",
  "evidence.upload",
];

export function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

/**
 * Single funnel for every field mutation.
 * Today: executes immediately and fails loudly when offline.
 * Tomorrow: enqueue + replay through the existing offline queue.
 */
export async function runFieldMutation<T>(
  operation: FieldOperation,
  execute: () => Promise<T>,
  options?: { successMessage?: string; errorMessage?: string },
): Promise<T | null> {
  if (!isOnline()) {
    toast.error("Connexion requise", {
      description: "La saisie hors-ligne n'est pas encore disponible pour cette action.",
    });
    return null;
  }
  try {
    const result = await execute();
    if (options?.successMessage) toast.success(options.successMessage);
    return result;
  } catch (error) {
    console.error(`[field:${operation}]`, error);
    toast.error(options?.errorMessage ?? "Échec de l'enregistrement", {
      description: error instanceof Error ? error.message : undefined,
    });
    return null;
  }
}
