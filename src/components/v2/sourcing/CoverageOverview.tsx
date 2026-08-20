// AGRI-GRID V2 — Phase 1D: coverage overview (identified potential supply, never reserved).
import { useTranslation } from "react-i18next";
import type { CoverageSummary } from "@/lib/v2/sourcing";

const Metric = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="rounded-md border border-border p-3">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="mt-1 text-lg font-semibold">{value}</p>
    {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
  </div>
);

const CoverageOverview = ({ summary }: { summary: CoverageSummary }) => {
  const { t } = useTranslation();
  const pct = Math.round(summary.coverageRatio * 100);

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-medium">{t("v2.sourcing.coverage.title")}</h2>
        <span className={`text-2xl font-semibold ${pct >= 100 ? "text-primary" : "text-foreground"}`}>{pct}%</span>
      </div>
      <div className="mt-3 h-2 w-full rounded-full bg-muted">
        <div
          className={`h-2 rounded-full ${pct >= 100 ? "bg-primary" : pct >= 50 ? "bg-accent" : "bg-destructive"}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Metric label={t("v2.sourcing.coverage.requested")} value={`${summary.requestedTonnes.toFixed(1)} t`} />
        <Metric
          label={t("v2.sourcing.coverage.identified")}
          value={`${summary.identifiedTonnes.toFixed(1)} t`}
          hint={t("v2.sourcing.coverage.identifiedHint")}
        />
        <Metric
          label={t("v2.sourcing.coverage.highConfidence")}
          value={`${summary.highConfidenceTonnes.toFixed(1)} t`}
          hint={t("v2.sourcing.coverage.highConfidenceHint")}
        />
        <Metric
          label={t("v2.sourcing.coverage.gap")}
          value={`${summary.potentialGap.toFixed(1)} t`}
          hint={t("v2.sourcing.coverage.gapHint", { tonnes: summary.highConfidenceGap.toFixed(1) })}
        />
        <Metric
          label={t("v2.sourcing.coverage.suppliers")}
          value={String(summary.supplierCount)}
          hint={
            summary.weightedAvgDistanceKm == null
              ? undefined
              : t("v2.sourcing.coverage.avgDistance", { km: summary.weightedAvgDistanceKm.toFixed(0) })
          }
        />
      </div>

      <p className="mt-4 text-xs text-muted-foreground">{t("v2.sourcing.coverage.advisoryNote")}</p>
    </section>
  );
};

export default CoverageOverview;
