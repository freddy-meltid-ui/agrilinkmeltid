// AGRI-GRID V2 — layout route: feature flag guard + organization context + shell
import { Navigate, Outlet } from "react-router-dom";
import { OrganizationProvider } from "@/hooks/v2/useOrganization";
import AppShell from "@/components/v2/layout/AppShell";
import { isV2Enabled, V1_HOME } from "@/lib/v2/featureFlags";

const V2Layout = () => {
  if (!isV2Enabled()) return <Navigate to={V1_HOME} replace />;

  return (
    <OrganizationProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </OrganizationProvider>
  );
};

export default V2Layout;
