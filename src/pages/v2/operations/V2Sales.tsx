// AGRI-GRID V2 — Phase 2B: sales list. Sales value and cash collected are shown
// as two separate figures and are never merged.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Coins, Loader2, Plus, Receipt, ShoppingCart, Users } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import KpiCard from "@/components/v2/ui-kit/KpiCard";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOrganization } from "@/hooks/v2/useOrganization";
import { PAYMENT_TONE, SALES_TONE, fetchSalesOrders, formatMoney, type SalesOrderRow } from "@/lib/v2/sales";
import { localeTag } from "@/lib/v2/locale";

const V2Sales = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { activeOrg, loading: orgLoading } = useOrganization();
  const [orders, setOrders] = useState<SalesOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    if (!activeOrg) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setOrders(await fetchSalesOrders(activeOrg.id));
    setLoading(false);
  }, [activeOrg]);

  useEffect(() => {
    if (!orgLoading) load();
  }, [orgLoading, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) =>
      `${o.sales_reference} ${o.customer?.display_name ?? ""} ${o.status}`.toLowerCase().includes(q),
    );
  }, [orders, search]);

  const active = orders.filter((o) => o.status !== "cancelled");
  const salesValue = active.reduce((s, o) => s + Number(o.total_amount), 0);
  const collected = active.reduce((s, o) => s + Number(o.paid_amount), 0);

  if (loading || orgLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  return (
    <>
      <PageHeader
        title={t("v2.sales.list.title")}
        description={t("v2.sales.list.description")}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/app/operations/customers")}>
              <Users className="mr-2 h-4 w-4" />
              {t("v2.sales.customers.title")}
            </Button>
            <Button onClick={() => navigate("/app/operations/sales/new")}>
              <Plus className="mr-2 h-4 w-4" />
              {t("v2.sales.list.new")}
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={t("v2.sales.kpi.salesRecorded")} value={formatMoney(salesValue, "XOF", localeTag(i18n.language))} icon={Receipt} />
        <KpiCard label={t("v2.sales.kpi.cashCollected")} value={formatMoney(collected, "XOF", localeTag(i18n.language))} icon={Coins} />
        <KpiCard
          label={t("v2.sales.kpi.outstanding")}
          value={formatMoney(salesValue - collected, "XOF", localeTag(i18n.language))}
          hint={t("v2.sales.kpi.outstandingHint")}
          icon={Coins}
        />
        <KpiCard label={t("v2.sales.kpi.orders")} value={active.length} icon={ShoppingCart} />
      </div>

      <Input
        className="mb-4 max-w-sm"
        placeholder={t("v2.sales.list.search")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <EmptyState icon={ShoppingCart} title={t("v2.sales.list.emptyTitle")} description={t("v2.sales.list.emptyDescription")} />
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => navigate(`/app/operations/sales/${o.id}`)}
              className="w-full rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {o.sales_reference} · {o.customer?.display_name ?? "—"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(o.order_date).toLocaleDateString(localeTag(i18n.language))} ·{" "}
                    {t("v2.sales.list.paidOf", {
                      paid: formatMoney(Number(o.paid_amount), o.currency, localeTag(i18n.language)),
                      total: formatMoney(Number(o.total_amount), o.currency, localeTag(i18n.language)),
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge label={t(`v2.sales.status.${o.status}`)} tone={SALES_TONE[o.status] ?? "neutral"} />
                  <StatusBadge label={t(`v2.sales.paymentStatus.${o.payment_status}`)} tone={PAYMENT_TONE[o.payment_status] ?? "neutral"} />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );
};

export default V2Sales;
