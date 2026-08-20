// AGRI-GRID V2 — processor dashboard (Phase 1A profile + Phase 1C supply signals)
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Building2, Factory, Gauge, Loader2, Package, ShoppingCart, Sprout, Truck, Users } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import KpiCard from "@/components/v2/ui-kit/KpiCard";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import { Button } from "@/components/ui/button";
import CoveragePanel from "@/components/v2/supply/CoveragePanel";
import PipelineSummary from "@/components/v2/supply/PipelineSummary";
import { useProcessor } from "@/hooks/v2/useProcessor";
import { completeness, totalMonthlyTonnes } from "@/lib/v2/processor";
import { fetchSupplyCoverage, fetchSupplyPipeline, type CoverageRow, type PipelineRow } from "@/lib/v2/commercialSupply";
import SourcingRequestsPanel from "@/components/v2/sourcing/SourcingRequestsPanel";

const V2Dashboard = () => {
  const { t } = useTranslation();
  const { bundle, loading, activeOrg } = useProcessor();
  const [coverage, setCoverage] = useState<CoverageRow[]>([]);
  const [pipeline, setPipeline] = useState<PipelineRow[]>([]);

  useEffect(() => {
    if (!activeOrg) return;
    const main = bundle.facilities.find((f) => f.is_main) ?? bundle.facilities[0];
    fetchSupplyCoverage(activeOrg.id, main?.id ?? null).then(setCoverage).catch(() => setCoverage([]));
    fetchSupplyPipeline({ facilityId: main?.id ?? null }).then(setPipeline).catch(() => setPipeline([]));
  }, [activeOrg, bundle.facilities]);



  if (loading) {
    return (
      <>
        <PageHeader title={t("v2.dashboard.title")} description={t("v2.dashboard.description")} />
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </>
    );
  }

  if (!activeOrg || !bundle.profile) {
    return (
      <>
        <PageHeader title={t("v2.dashboard.title")} description={t("v2.dashboard.description")} />
        <EmptyState
          icon={Building2}
          title={t("v2.dashboard.noOrgTitle")}
          description={t("v2.dashboard.noOrgDescription")}
          action={
            <Link to="/app/onboarding">
              <Button>{t("v2.dashboard.ctaOnboarding")}</Button>
            </Link>
          }
        />
      </>
    );
  }

  const monthly = totalMonthlyTonnes(bundle.needs);
  const score = completeness(bundle);

  return (
    <>
      <PageHeader
        title={activeOrg.name}
        description={t("v2.dashboard.processorSubtitle")}
        actions={
          <Link to="/app/processor">
            <Button variant="outline">{t("v2.dashboard.viewProfile")}</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={t("v2.dashboard.facilities")} value={bundle.facilities.length} icon={Factory} />
        <KpiCard label={t("v2.dashboard.products")} value={bundle.products.length} icon={Package} />
        <KpiCard label={t("v2.dashboard.rawMaterials")} value={bundle.needs.length} icon={Sprout} />
        <KpiCard
          label={t("v2.dashboard.monthlyNeed")}
          value={monthly ? `${monthly} t` : "—"}
          hint={t("v2.dashboard.monthlyNeedHint")}
          icon={Gauge}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <CoveragePanel rows={coverage} />
        <PipelineSummary rows={pipeline} />
      </div>
      <div className="mt-6">
        <SourcingRequestsPanel organizationId={activeOrg.id} />
      </div>

      <div className="mt-3">
        <Link to="/app/supply">
          <Button variant="outline" size="sm">{t("v2.supplyIntel.title")}</Button>
        </Link>
      </div>



      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-3 font-medium">{t("v2.dashboard.activities")}</h2>
          {bundle.products.length ? (
            <ul className="space-y-2 text-sm">
              {bundle.products.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-md border border-border p-3">
                  <span>{p.product_name}</span>
                  {p.value_chain && <StatusBadge label={t(`v2.valueChains.${p.value_chain}`, { defaultValue: p.value_chain })} tone="info" />}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t("v2.processor.noProducts")}</p>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-3 font-medium">{t("v2.dashboard.rawMaterialsTitle")}</h2>
          {bundle.needs.length ? (
            <ul className="space-y-2 text-sm">
              {bundle.needs.map((n) => (
                <li key={n.id} className="flex items-center justify-between rounded-md border border-border p-3">
                  <span>
                    {n.crop}
                    {n.variety ? ` — ${n.variety}` : ""}
                  </span>
                  <span className="text-muted-foreground">
                    {n.quantity ?? "—"} {t(`v2.units.${n.unit}`, { defaultValue: n.unit })} /{" "}
                    {t(`v2.frequencies.${n.frequency}`, { defaultValue: n.frequency })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title={t("v2.dashboard.noNeedsTitle")}
              description={t("v2.dashboard.noNeedsDescription")}
              action={
                <Link to="/app/onboarding">
                  <Button>{t("v2.dashboard.ctaAddNeeds")}</Button>
                </Link>
              }
            />
          )}
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-3 font-medium">{t("v2.dashboard.completeness")}</h2>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${score}%` }} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {score}% · {t("v2.dashboard.completenessHint")}
          </p>
          {score < 100 && (
            <Link to="/app/onboarding">
              <Button variant="outline" size="sm" className="mt-3">
                {t("v2.dashboard.ctaComplete")}
              </Button>
            </Link>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-3 font-medium">{t("v2.dashboard.operationsTitle")}</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: ShoppingCart, key: "purchases" },
              { icon: Users, key: "suppliers" },
              { icon: Truck, key: "deliveries" },
            ].map(({ icon: Icon, key }) => (
              <div key={key} className="rounded-md border border-dashed border-border p-4 text-center">
                <Icon className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                <p className="text-sm font-medium">{t(`v2.dashboard.empty.${key}`)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("v2.dashboard.empty.none")}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t("v2.dashboard.empty.sourcingSoon")}</p>
        </section>
      </div>
    </>
  );
};

export default V2Dashboard;
