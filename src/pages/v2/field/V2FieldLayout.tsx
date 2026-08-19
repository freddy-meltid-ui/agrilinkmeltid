// AGRI-GRID V2 — field module layout: provides field-network context + access guard
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShieldAlert } from "lucide-react";
import { FieldNetworkProvider, useFieldNetwork } from "@/hooks/v2/useFieldNetwork";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";

const Guard = () => {
  const { loading, hasFieldAccess } = useFieldNetwork();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!hasFieldAccess) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title={t("v2.field.noAccess.title")}
        description={t("v2.field.noAccess.description")}
      />
    );
  }

  return <Outlet />;
};

const V2FieldLayout = () => (
  <FieldNetworkProvider>
    <Guard />
  </FieldNetworkProvider>
);

export default V2FieldLayout;
