// AGRI-GRID V2 — organization (tenant) context
import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type V2OrgRole =
  | "processor_admin"
  | "processor_employee"
  | "field_agent"
  | "farmer"
  | "cooperative_manager"
  | "agrigrid_admin"
  | "compliance_advisor"
  | "financial_partner";

export type V2Organization = {
  id: string;
  name: string;
  legal_name: string | null;
  org_type: string;
  country: string;
  region: string | null;
  city: string | null;
  status: string;
  created_at: string;
};

export type V2Membership = {
  organization_id: string;
  role: V2OrgRole;
};

type OrganizationContextType = {
  loading: boolean;
  organizations: V2Organization[];
  memberships: V2Membership[];
  activeOrg: V2Organization | null;
  activeRole: V2OrgRole | null;
  setActiveOrg: (id: string) => void;
  refresh: () => Promise<void>;
};

const ACTIVE_ORG_KEY = "AGRIGRID_V2_ACTIVE_ORG";

const OrganizationContext = createContext<OrganizationContextType>({
  loading: true,
  organizations: [],
  memberships: [],
  activeOrg: null,
  activeRole: null,
  setActiveOrg: () => {},
  refresh: async () => {},
});

export const useOrganization = () => useContext(OrganizationContext);

export const OrganizationProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<V2Organization[]>([]);
  const [memberships, setMemberships] = useState<V2Membership[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setOrganizations([]);
      setMemberships([]);
      setActiveOrgId(null);
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data: memberRows, error: memberError } = await supabase
      .from("v2_organization_members")
      .select("organization_id, role")
      .eq("user_id", user.id);

    if (memberError || !memberRows?.length) {
      setMemberships([]);
      setOrganizations([]);
      setActiveOrgId(null);
      setLoading(false);
      return;
    }

    const { data: orgRows } = await supabase
      .from("v2_organizations")
      .select("*")
      .in("id", memberRows.map((m) => m.organization_id))
      .order("created_at", { ascending: true });

    setMemberships(memberRows as V2Membership[]);
    setOrganizations((orgRows as V2Organization[]) || []);

    const stored = typeof window !== "undefined" ? window.localStorage.getItem(ACTIVE_ORG_KEY) : null;
    const valid = stored && orgRows?.some((o: any) => o.id === stored) ? stored : orgRows?.[0]?.id ?? null;
    setActiveOrgId(valid);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    load();
  }, [authLoading, load]);

  const setActiveOrg = useCallback((id: string) => {
    setActiveOrgId(id);
    try {
      window.localStorage.setItem(ACTIVE_ORG_KEY, id);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const value = useMemo<OrganizationContextType>(() => {
    const activeOrg = organizations.find((o) => o.id === activeOrgId) ?? null;
    const activeRole = memberships.find((m) => m.organization_id === activeOrgId)?.role ?? null;
    return {
      loading: loading || authLoading,
      organizations,
      memberships,
      activeOrg,
      activeRole,
      setActiveOrg,
      refresh: load,
    };
  }, [organizations, memberships, activeOrgId, loading, authLoading, setActiveOrg, load]);

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
};
