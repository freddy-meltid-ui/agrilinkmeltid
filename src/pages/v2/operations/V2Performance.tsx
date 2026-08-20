// AGRI-GRID V2 — Phase 2B: business performance. Every figure is aggregated in the
// database from source records — there are no maintained KPI counters and no
// fabricated values.
//
// TERMINOLOGY (deliberately conservative):
//  * "Sales recorded" is revenue recorded, NOT cash.
//  * "Cash collected" is cash actually received, NOT revenue.
//  * No "gross profit" or "net profit" is displayed: packaging, labour, energy,
//    depreciation and taxes are not fully captured. Only direct raw-material cost
//    is traceable, and it is labelled as such.
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Boxes, Coins, Factory, Loader2, Receipt, ShoppingCart, TrendingUp, Wallet } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import KpiCard from "@/components/v2/ui-kit/KpiCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useOrganization } from "@/hooks/v2/useOrganization";
import {
  fetchBusinessCompleteness,
  fetchBusinessPerformance,
  fetchBusinessTrend,
  fetchExpenseBreakdown,
  formatMoney,
  resolvePeriod,
  type BusinessCompleteness,
  type BusinessPerformance,
  type BusinessTrendRow,
  type ExpenseBreakdownRow,
  type PeriodKey,
} from "@/lib/v2/sales";
import { localeTag } from "@/lib/v2/locale";

const PERIODS: PeriodKey[] = ["this_month", "last_month", "last_3_months", "custom"];

const qty = (rows: { unit_code: string; quantity: number }[] | undefined) =>
  !rows || rows.length === 0 ? "—" : rows.map((r) => `${Number(r.quantity).toFixed(2)} ${r.unit_code}`).join(" · ");

const V2Performance = () => {
  const { t, i18n } = useTranslation();
  const loc = localeTag(i18n.language);
  const { activeOrg, loading: orgLoading } = useOrganization();

  const [period, setPeriod] = useState<PeriodKey>("this_month");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [perf, setPerf] = useState<BusinessPerformance | null>(null);
  const [trend, setTrend] = useState<BusinessTrendRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseBreakdownRow[]>([]);
  const [completeness, setCompleteness] = useState<BusinessCompleteness | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeOrg) {
      setLoading(false);
      return;
    }
    const range = resolvePeriod(period, custom.from && custom.to ? custom : undefined);
    setLoading(true);
    const [p, tr, ex, c] = await Promise.all([
      fetchBusinessPerformance(activeOrg.id, range.from, range.to),
      fetchBusinessTrend(activeOrg.id, 6),
      fetchExpenseBreakdown(activeOrg.id, range.from, range.to),
      fetchBusinessCompleteness(activeOrg.id),
    ]);
    setPerf(p);
    setTrend(tr);
    setExpenses(ex);
    setCompleteness(c);
    setLoading(false);
  }, [activeOrg, period, custom]);

  useEffect(() => {
    if (!orgLoading) load();
  }, [orgLoading, load]);

  if (loading || orgLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  const maxTrend = Math.max(1, ...trend.flatMap((r) => [Number(r.sales_value), Number(r.cash_collected)]));
  const cashIncomplete = !perf || perf.cash_accounts_configured === 0;

  return (
    <>
      <PageHeader title={t("v2.performance.title")} description={t("v2.performance.description")} />

      <div className="mb-6 flex flex-wrap items-end gap-2">
        {PERIODS.map((p) => (
          <Button key={p} size="sm" variant={period === p ? "default" : "outline"} onClick={() => setPeriod(p)}>
            {t(`v2.performance.period.${p}`)}
          </Button>
        ))}
        {period === "custom" && (
          <div className="flex items-end gap-2">
            <Input type="date" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
            <Input type="date" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} />
          </div>
        )}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={t("v2.performance.kpi.salesRecorded")} value={formatMoney(perf?.sales_recorded, "XOF", loc)} hint={t("v2.performance.kpi.salesHint")} icon={Receipt} />
        <KpiCard label={t("v2.performance.kpi.cashCollected")} value={formatMoney(perf?.cash_collected, "XOF", loc)} hint={t("v2.performance.kpi.cashHint")} icon={Coins} />
        <KpiCard label={t("v2.performance.kpi.outstanding")} value={formatMoney(perf?.outstanding_receivables, "XOF", loc)} icon={Wallet} />
        <KpiCard label={t("v2.performance.kpi.procurement")} value={formatMoney(perf?.procurement_spend, "XOF", loc)} hint={t("v2.performance.kpi.procurementHint")} icon={ShoppingCart} />
        <KpiCard label={t("v2.performance.kpi.otherExpenses")} value={formatMoney(perf?.other_operating_expenses, "XOF", loc)} hint={t("v2.performance.kpi.otherExpensesHint")} icon={Receipt} />
        <KpiCard label={t("v2.performance.kpi.goodsSold")} value={qty(perf?.finished_goods_sold)} icon={Boxes} />
        <KpiCard label={t("v2.performance.kpi.production")} value={qty(perf?.production_volume)} icon={Factory} />
        <KpiCard
          label={t("v2.performance.kpi.rawInventory")}
          value={`${Number(perf?.raw_material_inventory_tonnes ?? 0).toFixed(3)} t`}
          hint={t("v2.performance.kpi.rawConsumed", { tonnes: Number(perf?.raw_material_consumed_tonnes ?? 0).toFixed(3) })}
          icon={Boxes}
        />
        <KpiCard label={t("v2.performance.kpi.fgInventory")} value={qty(perf?.finished_goods_inventory)} icon={Boxes} />
        <KpiCard
          label={t("v2.performance.kpi.cashPosition")}
          value={cashIncomplete ? t("v2.performance.cashIncomplete") : formatMoney((perf?.cash_in ?? 0) - (perf?.cash_out ?? 0), "XOF", loc)}
          hint={t("v2.performance.kpi.cashFlowHint", {
            in: formatMoney(perf?.cash_in, "XOF", loc),
            out: formatMoney(perf?.cash_out, "XOF", loc),
          })}
          icon={Wallet}
        />
      </div>

      {/* revenue vs cash — deliberately two separate series */}
      <section className="mb-6 rounded-lg border border-border bg-card p-4">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <TrendingUp className="h-4 w-4" />
          {t("v2.performance.trend.title")}
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">{t("v2.performance.trend.hint")}</p>
        <div className="space-y-3">
          {trend.map((r) => (
            <div key={String(r.month)}>
              <div className="mb-1 flex justify-between text-xs">
                <span>{new Date(String(r.month)).toLocaleDateString(loc, { month: "short", year: "2-digit" })}</span>
                <span className="text-muted-foreground">
                  {t("v2.performance.trend.line", {
                    sales: formatMoney(Number(r.sales_value), "XOF", loc),
                    cash: formatMoney(Number(r.cash_collected), "XOF", loc),
                  })}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${(Number(r.sales_value) / maxTrend) * 100}%` }} />
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-muted">
                <div className="h-2 rounded-full bg-secondary" style={{ width: `${(Number(r.cash_collected) / maxTrend) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* expenses */}
      <section className="mb-6 rounded-lg border border-border bg-card p-4">
        <h2 className="mb-1 text-sm font-semibold">{t("v2.performance.expenses.title")}</h2>
        <p className="mb-3 text-xs text-muted-foreground">{t("v2.performance.expenses.hint")}</p>
        {expenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("v2.performance.expenses.empty")}</p>
        ) : (
          <div className="space-y-2">
            {expenses.map((e) => (
              <div key={e.category} className="flex items-center justify-between text-sm">
                <span>{t(`v2.expenses.categories.${e.category}`)}</span>
                <span className="text-muted-foreground">
                  {formatMoney(Number(e.total), "XOF", loc)} · {t("v2.performance.expenses.paid", { amount: formatMoney(Number(e.paid), "XOF", loc) })}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* completeness — explicitly NOT a credit score */}
      {completeness && (
        <section className="mb-10 rounded-lg border border-border bg-card p-4">
          <h2 className="mb-1 text-sm font-semibold">{t("v2.performance.completeness.title")}</h2>
          <p className="mb-3 text-xs text-muted-foreground">{t("v2.performance.completeness.hint")}</p>
          <div className="space-y-3">
            {(["sales_tracking", "payment_tracking", "expense_tracking", "inventory_tracking"] as const).map((k) => (
              <div key={k}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>{t(`v2.performance.completeness.${k}`)}</span>
                  <span className="text-muted-foreground">{Number(completeness[k])}%</span>
                </div>
                <Progress value={Number(completeness[k])} />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
};

export default V2Performance;
