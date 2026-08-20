// AGRI-GRID V2 — Phase 3B: finance readiness dashboard.
// Readiness measures record completeness, never creditworthiness.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  CircleDollarSign,
  FileText,
  Loader2,
  Receipt,
  ShieldCheck,
  Truck,
  Wallet,
} from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import KpiCard from "@/components/v2/ui-kit/KpiCard";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/v2/useOrganization";
import {
  fetchFinanceReadiness,
  fetchFinanceSnapshot,
  formatAmount,
  readinessTone,
  type FinanceReadiness,
  type FinanceSnapshot,
} from "@/lib/v2/finance";

const V2FinanceOverview = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { activeOrg, loading: orgLoading } = useOrganization();
  const [readiness, setReadiness] = useState<FinanceReadiness | null>(null);
  const [snapshot, setSnapshot] = useState<FinanceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeOrg) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        fetchFinanceReadiness(activeOrg.id),
        fetchFinanceSnapshot(activeOrg.id, 12),
      ]);
      setReadiness(r);
      setSnapshot(s);
    } catch (e) {
      toast({ title: t("v2.common.error"), description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [activeOrg, toast, t]);

  useEffect(() => {
    if (!orgLoading) load();
  }, [orgLoading, load]);

  if (loading || orgLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activeOrg || !readiness || !snapshot) {
    return <EmptyState icon={Wallet} title={t("v2.finance.noData")} />;
  }

  const lang = i18n.language;
  const docs = readiness.documents ?? [];
  const requiredTotal = docs.filter((d) => d.importance === "required").length;
  const requiredAvailable = docs.filter((d) => d.importance === "required" && d.available).length;

  return (
    <div>
      <PageHeader title={t("v2.finance.title")} description={t("v2.finance.overviewDescription")} />

      {snapshot?.multi_currency && (
        <p className="mb-4 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          {t("v2.finance.multiCurrencyNotice")}
        </p>
      )}

      {/* headline readiness */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("v2.finance.readinessLabel")}
            </p>
            <p className="mt-1 text-4xl font-semibold text-foreground">{readiness.readiness}%</p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <StatusBadge
              label={t(`v2.finance.states.${readiness.state}`)}
              tone={readinessTone(readiness.state)}
            />
            <StatusBadge
              label={t(`v2.finance.maturity.${readiness.history.maturity}`)}
              tone="neutral"
            />
          </div>
        </div>
        <Progress value={readiness.readiness} className="mt-4 h-2" />
        <p className="mt-3 text-xs text-muted-foreground">{t("v2.finance.notACreditScore")}</p>
      </div>

      {/* qualifiers — never hidden by a high percentage */}
      {readiness.qualifiers?.length > 0 && (
        <div className="mt-4 rounded-lg border border-border bg-muted/40 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <AlertTriangle className="h-4 w-4" />
            {t("v2.finance.qualifiersTitle")}
          </p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {readiness.qualifiers.map((q) => (
              <li key={q}>• {t(`v2.finance.qualifiers.${q}`)}</li>
            ))}
          </ul>
        </div>
      )}

      {/* headline facts */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={t("v2.finance.kpi.history")}
          value={`${readiness.history.months_of_history} ${t("v2.finance.monthsShort")}`}
          hint={t("v2.finance.kpi.historyHint", { count: readiness.history.active_months })}
          icon={CalendarClock}
        />
        <KpiCard
          label={t("v2.finance.kpi.documents")}
          value={`${requiredAvailable}/${requiredTotal}`}
          hint={t("v2.finance.kpi.documentsHint")}
          icon={FileText}
        />
        <KpiCard
          label={t("v2.finance.kpi.sales")}
          value={formatAmount(snapshot.sales?.value, snapshot.currency, lang)}
          hint={t("v2.finance.source.agrigrid_sales")}
          icon={Receipt}
        />
        <KpiCard
          label={t("v2.finance.kpi.collected")}
          value={formatAmount(snapshot.collections?.cash_collected, snapshot.currency, lang)}
          hint={
            snapshot.collections?.collection_ratio != null
              ? t("v2.finance.kpi.collectionRatio", { value: snapshot.collections.collection_ratio })
              : t("v2.finance.source.agrigrid_payments")
          }
          icon={CircleDollarSign}
        />
        <KpiCard
          label={t("v2.finance.kpi.outstanding")}
          value={formatAmount(snapshot.collections?.outstanding_receivables, snapshot.currency, lang)}
          hint={t("v2.finance.source.agrigrid_payments")}
          icon={Wallet}
        />
        <KpiCard
          label={t("v2.finance.kpi.procurement")}
          value={formatAmount(snapshot.procurement?.procurement_value, snapshot.currency, lang)}
          hint={t("v2.finance.kpi.procurementHint", {
            tonnes: snapshot.procurement?.accepted_tonnes ?? 0,
            suppliers: snapshot.procurement?.active_suppliers ?? 0,
          })}
          icon={Truck}
        />
        <KpiCard
          label={t("v2.finance.kpi.compliance")}
          value={`${readiness.dimensions.find((d) => d.key === "compliance")?.score ?? 0}%`}
          hint={t("v2.finance.source.agrigrid_compliance")}
          icon={ShieldCheck}
        />
        <KpiCard
          label={t("v2.finance.kpi.request")}
          value={
            snapshot.financing_request
              ? t(`v2.finance.requestStatus.${snapshot.financing_request.status}`)
              : t("v2.finance.kpi.noRequest")
          }
          hint={
            snapshot.financing_request?.requested_amount
              ? formatAmount(
                  Number(snapshot.financing_request.requested_amount),
                  snapshot.financing_request.currency ?? "XOF",
                  lang
                )
              : t("v2.finance.kpi.requestHint")
          }
          icon={BadgeCheck}
        />
      </div>

      {/* dimensions */}
      <h2 className="mt-8 font-serif text-xl text-foreground">{t("v2.finance.dimensionsTitle")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{readiness.formula}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {readiness.dimensions.map((d) => (
          <div key={d.key} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">{t(`v2.finance.dimensions.${d.key}.label`)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t(`v2.finance.dimensions.${d.key}.why`)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-semibold text-foreground">{d.score}%</p>
                <p className="text-xs text-muted-foreground">
                  {t("v2.finance.weight")} {d.weight}%
                </p>
              </div>
            </div>
            <Progress value={d.score} className="mt-3 h-1.5" />
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">{t("v2.finance.available")}: </span>
                {Object.entries(d.facts ?? {})
                  .filter(([, v]) => v !== null && v !== undefined && typeof v !== "object")
                  .map(([k, v]) => `${t(`v2.finance.facts.${k}`, { defaultValue: k })}: ${String(v)}`)
                  .join(" · ") || "—"}
              </p>
              <p>
                <span className="font-medium text-foreground">{t("v2.finance.missing")}: </span>
                {d.missing?.length
                  ? d.missing.map((m) => t(`v2.finance.missingItems.${m}`, { defaultValue: m })).join(" · ")
                  : t("v2.finance.nothingMissing")}
              </p>
              <p>
                <span className="font-medium text-foreground">{t("v2.finance.sourceLabel")}: </span>
                {t(`v2.finance.source.${d.source}`, { defaultValue: d.source })}
              </p>
              <p>
                <span className="font-medium text-foreground">{t("v2.finance.nextStep")}: </span>
                {t(`v2.finance.dimensions.${d.key}.next`)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link to="/app/finance/request">{t("v2.finance.tabs.request")}</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/app/finance/documents">{t("v2.finance.tabs.documents")}</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/app/finance/dossier">{t("v2.finance.tabs.dossier")}</Link>
        </Button>
      </div>
    </div>
  );
};

export default V2FinanceOverview;
