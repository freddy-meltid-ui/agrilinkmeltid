// AGRI-GRID V2 — secondary entry point to the legacy marketplace (V1 preserved)
import { Link } from "react-router-dom";
import { Store } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import { Button } from "@/components/ui/button";

const V2Marketplace = () => {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader
        title={t("v2.marketplace.title")}
        description={t("v2.marketplace.description")}
        actions={<StatusBadge label={t("v2.marketplace.legacyBadge")} />}
      />
      <EmptyState
        icon={Store}
        title={t("v2.marketplace.emptyTitle")}
        description={t("v2.marketplace.emptyDescription")}
        action={
          <Link to="/marketplace">
            <Button>{t("v2.marketplace.open")}</Button>
          </Link>
        }
      />
    </>
  );
};

export default V2Marketplace;
