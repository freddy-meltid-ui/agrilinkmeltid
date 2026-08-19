// AGRI-GRID V2 — Phase 1C: recurring needs vs identified local supply
import { useTranslation } from "react-i18next";
import { Target } from "lucide-react";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import type { CoverageRow } from "@/lib/v2/commercialSupply";

const CoveragePanel = ({ rows }: { rows: CoverageRow[] }) => {
  const { t, i18n } = useTranslation();
  const fr = i18n.language.startsWith("fr");

  if (!rows.length) {
    return <EmptyState icon={Target} title={t("v2.supplyIntel.coverage.emptyTitle")} description={t("v2.supplyIntel.coverage.emptyDescription")} />;
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <Target className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-medium">{t("v2.supplyIntel.coverage.title")}</h2>
      </div>
      <ul className="space-y-4">
        {rows.map((r) => {
          const ratio = Math.min(1, Number(r.coverage_ratio ?? 0));
          const pct = Math.round(ratio * 100);
          return (
            <li key={r.need_id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">
                  {fr ? r.crop_name_fr : r.crop_name_en}
                  {r.variety_name_fr ? ` — ${fr ? r.variety_name_fr : r.variety_name_en}` : ""}
                </span>
                <span className="text-muted-foreground">
                  {Number(r.identified_tonnes ?? 0).toFixed(1)} t / {Number(r.need_tonnes_per_month ?? 0).toFixed(1)} t {t("v2.supplyIntel.coverage.perMonth")}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full rounded-full bg-muted">
                <div className={`h-2 rounded-full ${pct >= 80 ? "bg-primary" : pct >= 40 ? "bg-accent" : "bg-destructive"}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("v2.supplyIntel.coverage.detail", {
                  pct,
                  suppliers: Number(r.supplier_count ?? 0),
                  radius: Number(r.radius_km ?? 0),
                  confirmed: Number(r.confirmed_tonnes ?? 0).toFixed(1),
                })}
              </p>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">{t("v2.supplyIntel.coverage.note")}</p>
    </section>
  );
};

export default CoveragePanel;
