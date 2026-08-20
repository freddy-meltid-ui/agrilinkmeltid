// AGRI-GRID V2 — Phase 1E: procurement operations hub (orders + KPIs).
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Boxes, ClipboardList, Factory, Loader2, PackageCheck, Receipt, ShoppingCart, TrendingUp, Truck } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import KpiCard from "@/components/v2/ui-kit/KpiCard";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOrganization } from "@/hooks/v2/useOrganization";
import {
  fetchOrders,
  fetchProcurementSummary,
  ORDER_TONE,
  type ProcurementOrder,
  type ProcurementSummaryRow,
} from "@/lib/v2/procurement";
import { localeTag } from "@/lib/v2/locale";

const V2Operations = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { activeOrg, loading: orgLoading } = useOrganization();
  const [orders, setOrders] = useState<ProcurementOrder[]>([]);
  const [summary, setSummary] = useState<ProcurementSummaryRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    if (!activeOrg) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [o, s] = await Promise.all([fetchOrders(activeOrg.id), fetchProcurementSummary(activeOrg.id)]);
    setOrders(o);
    setSummary(s);
    setLoading(false);
  }, [activeOrg]);

  useEffect(() => {
    if (!orgLoading) load();
  }, [orgLoading, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => `${o.order_number} ${o.delivery_location ?? ""} ${o.status}`.toLowerCase().includes(q));
  }, [orders, search]);

  if (loading || orgLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  return (
    <>
      <PageHeader
        title={t("v2.procurement.operations.title")}
        description={t("v2.procurement.operations.description")}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("/app/operations/inventory")}>
              <Boxes className="mr-2 h-4 w-4" />
              {t("v2.procurement.operations.inventoryCta")}
            </Button>
            <Button variant="outline" onClick={() => navigate("/app/operations/production")}>
              <Factory className="mr-2 h-4 w-4" />
              {t("v2.production.title")}
            </Button>
            <Button variant="outline" onClick={() => navigate("/app/operations/sales")}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              {t("v2.sales.list.title")}
            </Button>
            <Button variant="outline" onClick={() => navigate("/app/operations/expenses")}>
              <Receipt className="mr-2 h-4 w-4" />
              {t("v2.expenses.title")}
            </Button>
            <Button variant="outline" onClick={() => navigate("/app/operations/performance")}>
              <TrendingUp className="mr-2 h-4 w-4" />
              {t("v2.performance.title")}
            </Button>
          </>

        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={t("v2.procurement.kpi.pendingConfirmations")} value={Number(summary?.pending_confirmations ?? 0)} icon={ClipboardList} />
        <KpiCard label={t("v2.procurement.kpi.confirmedTonnes")} value={`${Number(summary?.confirmed_tonnes ?? 0).toFixed(1)} t`} icon={PackageCheck} />
        <KpiCard label={t("v2.procurement.kpi.expectedDeliveries")} value={Number(summary?.expected_deliveries ?? 0)} icon={Truck} />
        <KpiCard
          label={t("v2.procurement.kpi.inventory")}
          value={`${Number(summary?.inventory_tonnes ?? 0).toFixed(1)} t`}
          hint={t("v2.procurement.kpi.received30d", { tonnes: Number(summary?.received_tonnes_30d ?? 0).toFixed(1) })}
          icon={Boxes}
        />
      </div>

      <Input
        className="mb-4 max-w-sm"
        placeholder={t("v2.procurement.operations.search")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} title={t("v2.procurement.operations.emptyTitle")} description={t("v2.procurement.operations.emptyDescription")} />
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => navigate(`/app/operations/orders/${o.id}`)}
              className="w-full rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{o.order_number}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t("v2.procurement.operations.window", {
                      from: o.expected_delivery_start ? new Date(o.expected_delivery_start).toLocaleDateString(localeTag(i18n.language)) : "—",
                      to: o.expected_delivery_end ? new Date(o.expected_delivery_end).toLocaleDateString(localeTag(i18n.language)) : "—",
                    })}
                    {o.delivery_location ? ` · ${o.delivery_location}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {o.total_expected_amount != null && (
                    <span className="text-sm text-muted-foreground">
                      {Number(o.total_expected_amount).toLocaleString(localeTag(i18n.language))} {o.currency}
                    </span>
                  )}
                  <StatusBadge
                    label={t(`v2.procurement.orderStatus.${o.status}`, { defaultValue: o.status })}
                    tone={ORDER_TONE[o.status] ?? "neutral"}
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

export default V2Operations;
