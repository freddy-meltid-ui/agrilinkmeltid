// AGRI-GRID V2 — Phase 2A: production batches hub. Read-only list; every write
// goes through the atomic v2_post_production RPC in the wizard.
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Factory, Loader2, PackageCheck, Plus, Boxes, Layers } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import KpiCard from "@/components/v2/ui-kit/KpiCard";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/hooks/v2/useOrganization";
import {
  fetchProductionBatches,
  fetchProductionSummary,
  PRODUCTION_TONE,
  type ProductionBatchRow,
  type ProductionSummaryRow,
} from "@/lib/v2/production";
import { localeTag } from "@/lib/v2/locale";

const V2Production = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { activeOrg, loading: orgLoading } = useOrganization();
  const [batches, setBatches] = useState<ProductionBatchRow[]>([]);
  const [summary, setSummary] = useState<ProductionSummaryRow | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeOrg) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [b, s] = await Promise.all([fetchProductionBatches(activeOrg.id), fetchProductionSummary(activeOrg.id)]);
    setBatches(b);
    setSummary(s);
    setLoading(false);
  }, [activeOrg]);

  useEffect(() => {
    if (!orgLoading) load();
  }, [orgLoading, load]);

  if (loading || orgLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  return (
    <>
      <PageHeader
        title={t("v2.production.title")}
        description={t("v2.production.description")}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("/app/operations/finished-goods")}>
              <PackageCheck className="mr-2 h-4 w-4" />
              {t("v2.production.finishedGoodsCta")}
            </Button>
            <Button onClick={() => navigate("/app/operations/production/new")}>
              <Plus className="mr-2 h-4 w-4" />
              {t("v2.production.newCta")}
            </Button>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={t("v2.production.kpi.batchesMonth")} value={Number(summary?.batches_this_month ?? 0)} icon={Factory} />
        <KpiCard
          label={t("v2.production.kpi.inputTonnes")}
          value={`${Number(summary?.input_tonnes_this_month ?? 0).toFixed(2)} t`}
          icon={Layers}
        />
        <KpiCard label={t("v2.production.kpi.finishedBatches")} value={Number(summary?.finished_batches ?? 0)} icon={PackageCheck} />
        <KpiCard
          label={t("v2.production.kpi.rawInventory")}
          value={`${Number(summary?.raw_inventory_tonnes ?? 0).toFixed(2)} t`}
          icon={Boxes}
        />
      </div>

      {batches.length === 0 ? (
        <EmptyState
          icon={Factory}
          title={t("v2.production.emptyTitle")}
          description={t("v2.production.emptyDescription")}
          action={<Button onClick={() => navigate("/app/operations/production/new")}>{t("v2.production.newCta")}</Button>}
        />
      ) : (
        <div className="space-y-3">
          {batches.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => navigate(`/app/operations/production/${b.id}`)}
              className="w-full rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-medium">{b.batch_reference}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {b.product?.product_name ?? "—"}
                    {b.facility?.name ? ` · ${b.facility.name}` : ""} ·{" "}
                    {new Date(b.production_date).toLocaleDateString(localeTag(i18n.language))}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{Number(b.total_input_tonnes).toFixed(3)} t</span>
                  <StatusBadge
                    label={t(`v2.production.status.${b.status}`, { defaultValue: b.status })}
                    tone={PRODUCTION_TONE[b.status] ?? "neutral"}
                  />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );
};

export default V2Production;
