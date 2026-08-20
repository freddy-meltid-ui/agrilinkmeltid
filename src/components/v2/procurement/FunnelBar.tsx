// AGRI-GRID V2 — Phase 1E: requested → identified → confirmed → ordered → received.
import { useTranslation } from "react-i18next";
import type { FunnelRow } from "@/lib/v2/procurement";

const Step = ({ label, value, ratio, tone }: { label: string; value: number; ratio: number; tone: string }) => (
  <div className="min-w-0 flex-1">
    <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="mt-1 text-lg font-semibold text-foreground">{value.toFixed(1)} t</p>
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, Math.max(0, ratio * 100))}%` }} />
    </div>
  </div>
);

const FunnelBar = ({ funnel }: { funnel: FunnelRow }) => {
  const { t } = useTranslation();
  const requested = Number(funnel.requested_tonnes ?? 0) || 1;
  const n = (v: number | null) => Number(v ?? 0);

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="mb-4 font-medium">{t("v2.procurement.funnel.title")}</h2>
      <div className="flex flex-wrap gap-5 sm:flex-nowrap">
        <Step label={t("v2.procurement.funnel.requested")} value={n(funnel.requested_tonnes)} ratio={1} tone="bg-muted-foreground/40" />
        <Step label={t("v2.procurement.funnel.identified")} value={n(funnel.identified_tonnes)} ratio={n(funnel.identified_tonnes) / requested} tone="bg-secondary-foreground/50" />
        <Step label={t("v2.procurement.funnel.confirmed")} value={n(funnel.confirmed_tonnes)} ratio={n(funnel.confirmed_tonnes) / requested} tone="bg-accent" />
        <Step label={t("v2.procurement.funnel.ordered")} value={n(funnel.ordered_tonnes)} ratio={n(funnel.ordered_tonnes) / requested} tone="bg-primary/60" />
        <Step label={t("v2.procurement.funnel.received")} value={n(funnel.accepted_tonnes)} ratio={n(funnel.accepted_tonnes) / requested} tone="bg-primary" />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {t("v2.procurement.funnel.hint", {
          toConfirm: n(funnel.remaining_to_confirm).toFixed(1),
          toReceive: n(funnel.remaining_to_receive).toFixed(1),
        })}
      </p>
    </section>
  );
};

export default FunnelBar;
