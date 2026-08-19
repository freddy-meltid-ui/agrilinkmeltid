// AGRI-GRID V2 — field network context (agent identity, workspace data, reference data)
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  AgentWorkspace,
  FieldAgent,
  fetchAgentWorkspace,
  fetchFieldAgent,
  isAgrigridAdmin,
} from "@/lib/v2/supply";
import { EMPTY_REFERENCE, fetchReferenceData, ReferenceData } from "@/lib/v2/reference";
import { FreshnessThresholds, loadFreshnessThresholds, DEFAULT_FRESHNESS_THRESHOLDS } from "@/lib/v2/freshness";

const EMPTY_WORKSPACE: AgentWorkspace = { suppliers: [], supplies: [], cycles: [], visits: [] };

type FieldNetworkContextType = {
  loading: boolean;
  agent: FieldAgent | null;
  isAdmin: boolean;
  hasFieldAccess: boolean;
  workspace: AgentWorkspace;
  reference: ReferenceData;
  thresholds: FreshnessThresholds;
  reload: () => Promise<void>;
};

const FieldNetworkContext = createContext<FieldNetworkContextType>({
  loading: true,
  agent: null,
  isAdmin: false,
  hasFieldAccess: false,
  workspace: EMPTY_WORKSPACE,
  reference: EMPTY_REFERENCE,
  thresholds: DEFAULT_FRESHNESS_THRESHOLDS,
  reload: async () => {},
});

export const useFieldNetwork = () => useContext(FieldNetworkContext);

export const FieldNetworkProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<FieldAgent | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [workspace, setWorkspace] = useState<AgentWorkspace>(EMPTY_WORKSPACE);
  const [reference, setReference] = useState<ReferenceData>(EMPTY_REFERENCE);
  const [thresholds, setThresholds] = useState<FreshnessThresholds>(DEFAULT_FRESHNESS_THRESHOLDS);

  const load = useCallback(async () => {
    if (!user) {
      setAgent(null);
      setIsAdmin(false);
      setWorkspace(EMPTY_WORKSPACE);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [agentRow, admin, ref, thr, ws] = await Promise.all([
      fetchFieldAgent(user.id),
      isAgrigridAdmin(user.id),
      fetchReferenceData(),
      loadFreshnessThresholds(),
      fetchAgentWorkspace(),
    ]);
    setAgent(agentRow);
    setIsAdmin(admin);
    setReference(ref);
    setThresholds(thr);
    setWorkspace(ws);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    load();
  }, [authLoading, load]);

  const value = useMemo<FieldNetworkContextType>(
    () => ({
      loading: loading || authLoading,
      agent,
      isAdmin,
      hasFieldAccess: Boolean(agent) || isAdmin,
      workspace,
      reference,
      thresholds,
      reload: load,
    }),
    [loading, authLoading, agent, isAdmin, workspace, reference, thresholds, load],
  );

  return <FieldNetworkContext.Provider value={value}>{children}</FieldNetworkContext.Provider>;
};
