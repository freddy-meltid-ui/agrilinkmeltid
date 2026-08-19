// AGRI-GRID V2 — freshness indicator (thresholds come from configuration, never from this component)
import { useTranslation } from "react-i18next";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import { computeFreshness, FRESHNESS_LABEL_KEY, FRESHNESS_TONE, FreshnessThresholds } from "@/lib/v2/freshness";

type Props = {
  date?: string | null;
  thresholds?: FreshnessThresholds;
  className?: string;
};

const FreshnessBadge = ({ date, thresholds, className }: Props) => {
  const { t } = useTranslation();
  const { status, days } = computeFreshness(date, thresholds);
  const label = t(FRESHNESS_LABEL_KEY[status]);
  return (
    <StatusBadge
      tone={FRESHNESS_TONE[status]}
      className={className}
      label={days === null ? label : `${label} · ${t("v2.field.daysAgo", { count: days })}`}
    />
  );
};

export default FreshnessBadge;
