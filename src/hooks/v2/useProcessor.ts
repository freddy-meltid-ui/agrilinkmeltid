// AGRI-GRID V2 — processor data hook for the active organization
import { useCallback, useEffect, useState } from "react";
import { useOrganization } from "@/hooks/v2/useOrganization";
import { fetchProcessorBundle, ProcessorBundle } from "@/lib/v2/processor";

const EMPTY: ProcessorBundle = { profile: null, facilities: [], products: [], needs: [] };

export function useProcessor() {
  const { activeOrg, loading: orgLoading } = useOrganization();
  const [bundle, setBundle] = useState<ProcessorBundle>(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeOrg) {
      setBundle(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    setBundle(await fetchProcessorBundle(activeOrg.id));
    setLoading(false);
  }, [activeOrg]);

  useEffect(() => {
    if (orgLoading) return;
    load();
  }, [orgLoading, load]);

  return { bundle, loading: loading || orgLoading, reload: load, activeOrg };
}
