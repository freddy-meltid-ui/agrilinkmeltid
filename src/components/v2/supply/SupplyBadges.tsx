// AGRI-GRID V2 — Phase 1C: shared badges for confidence / freshness / supply status
import { useTranslation } from "react-i18next";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import { CONFIDENCE_TONE, FRESHNESS_TONE } from "@/lib/v2/commercialSupply";

export const ConfidenceBadge = ({ value }: { value: string | null }) => {
  const { t } = useTranslation();
  if (!value) return null;
  return <StatusBadge label={t(`v2.supplyIntel.confidence.${value}`, { defaultValue: value })} tone={CONFIDENCE_TONE[value] ?? "neutral"} />;
};

export const FreshnessBadge = ({ value }: { value: string | null }) => {
  const { t } = useTranslation();
  if (!value) return null;
  return <StatusBadge label={t(`v2.supplyIntel.freshness.${value}`, { defaultValue: value })} tone={FRESHNESS_TONE[value] ?? "neutral"} />;
};

export const SupplyStatusBadge = ({ value }: { value: string | null }) => {
  const { t } = useTranslation();
  if (!value) return null;
  const tone = value === "available" ? "success" : value === "expected" ? "info" : "neutral";
  return <StatusBadge label={t(`v2.supply.status.${value}`, { defaultValue: value })} tone={tone} />;
};
