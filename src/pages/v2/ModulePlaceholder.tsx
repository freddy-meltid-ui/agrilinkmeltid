// AGRI-GRID V2 — generic placeholder for modules planned in later phases
import { Construction } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";

type Props = {
  titleKey: string;
  descriptionKey: string;
  phaseKey: string;
};

const ModulePlaceholder = ({ titleKey, descriptionKey, phaseKey }: Props) => {
  const { t } = useTranslation();

  return (
    <>
      <PageHeader
        title={t(titleKey)}
        description={t(descriptionKey)}
        actions={<StatusBadge label={t(phaseKey)} tone="info" />}
      />
      <EmptyState
        icon={Construction}
        title={t("v2.placeholder.title")}
        description={t("v2.placeholder.description")}
      />
    </>
  );
};

export default ModulePlaceholder;
