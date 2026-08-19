// AGRI-GRID V2 — Phase 1C: harvest pipeline (0-30 / 31-60 / 61-90 / 90+ days), no double counting
import { useTranslation } from "react-i18next";
import { CalendarClock } from "lucide-react";
import type { PipelineRow } from "@/lib/v2/commercialSupply";
import { PIPELINE_BUCKETS } from "@/lib/v2/commercialSupply";

const PipelineSummary = ({ rows }: { rows: PipelineRow[] }) => {
  const { t } = useTranslation();

  const byBucket = PIPELINE_BUCKETS.map((bucket) => {
    const items = rows.filter((r) => r.bucket === bucket);
    return {
      bucket,
      tonnes: items.reduce((s, r) => s + Number(r.quantity_tonnes ?? 0), 0),
      confirmed: items.filter((r) => r.source === "confirmed").reduce((s, r) => s + Number(r.quantity_tonnes ?? 0), 0),
      suppliers: items.reduce((m, r) => Math.max(m, Number(r.supplier_count ?? 0)), 0),
    };
  });

  const max = Math.max(1, ...byBucket.map((b) => b.tonnes));

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-medium">{t("v2.supplyIntel.pipeline.title")}</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        {byBucket.map((b) => (
          <div key={b.bucket} className="rounded-md border border-border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t(`v2.supplyIntel.pipeline.bucket.${b.bucket}`)}</p>
            <p className="mt-1 text-xl font-semibold">{b.tonnes.toFixed(1)} t</p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
              <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(b.tonnes / max) * 100}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("v2.supplyIntel.pipeline.confirmed", { value: b.confirmed.toFixed(1) })} · {t("v2.supplyIntel.pipeline.suppliers", { count: b.suppliers })}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{t("v2.supplyIntel.pipeline.note")}</p>
    </section>
  );
};

export default PipelineSummary;
