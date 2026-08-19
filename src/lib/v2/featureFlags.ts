// AGRI-GRID V2 — feature flags
// Lets us switch between the legacy V1 experience and the V2 app during development.

const STORAGE_KEY = "AGRIGRID_V2_ENABLED";

const DEFAULT_V2_ENABLED = true;

/** Reads the V2 flag from URL (?v2=1 / ?v2=0), then localStorage, then the build default. */
export function isV2Enabled(): boolean {
  if (typeof window === "undefined") return DEFAULT_V2_ENABLED;

  const param = new URLSearchParams(window.location.search).get("v2");
  if (param === "1" || param === "true") {
    setV2Enabled(true);
    return true;
  }
  if (param === "0" || param === "false") {
    setV2Enabled(false);
    return false;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "true") return true;
    if (stored === "false") return false;
  } catch {
    /* storage unavailable */
  }

  return DEFAULT_V2_ENABLED;
}

export function setV2Enabled(enabled: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    /* storage unavailable */
  }
}

export const V2_HOME = "/app/dashboard";
export const V1_HOME = "/dashboard";
