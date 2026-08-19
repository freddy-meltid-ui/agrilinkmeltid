// AGRI-GRID V2 — Phase 1C: internal data quality console (Agri-Grid admins & field agents only).
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import { fetchDataQualitySummary, type DataQualityRow } from "@/lib/v2/commercialSupply";

const V2DataQuality = () => {
  const { t } = useTranslation();
  const [rows, setRows] = useState<DataQualityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDataQualitySummary()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader title={t("v2.dataQuality.title")} description={t("v2.dataQuality.description")} />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("v2.supplyIntel.loading")}
        </div>
      ) : error ? (
        <EmptyState icon={AlertTriangle} title={t("v2.dataQuality.restrictedTitle")} description={t("v2.dataQuality.restrictedDescription")} />
      ) : rows.length === 0 ? (
        <EmptyState icon={ShieldCheck} title={t("v2.dataQuality.cleanTitle")} description={t("v2.dataQuality.cleanDescription")} />
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.issue} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
              <span className="text-sm">{t(`v2.dataQuality.issue.${r.issue}`, { defaultValue: r.issue })}</span>
              <StatusBadge
                label={String(r.record_count)}
                tone={Number(r.record_count) === 0 ? "success" : Number(r.record_count) > 5 ? "danger" : "warning"}
              />
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-muted-foreground">{t("v2.dataQuality.note")}</p>
    </>
  );
};

export default V2DataQuality;
