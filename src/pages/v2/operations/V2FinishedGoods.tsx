// AGRI-GRID V2 — Phase 2A: finished-goods inventory (ledger-backed read model).
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, PackageCheck } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrganization } from "@/hooks/v2/useOrganization";
import {
  FG_TONE,
  fetchFinishedGoodsMovements,
  fetchFinishedGoodsStock,
  type FinishedGoodsMovement,
  type FinishedGoodsStockRow,
} from "@/lib/v2/production";
import { localeTag } from "@/lib/v2/locale";

const V2FinishedGoods = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { activeOrg, loading: orgLoading } = useOrganization();
  const [stock, setStock] = useState<FinishedGoodsStockRow[]>([]);
  const [movements, setMovements] = useState<FinishedGoodsMovement[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeOrg) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [s, m] = await Promise.all([fetchFinishedGoodsStock(activeOrg.id), fetchFinishedGoodsMovements(activeOrg.id)]);
    setStock(s);
    setMovements(m);
    setLoading(false);
  }, [activeOrg]);

  useEffect(() => {
    if (!orgLoading) load();
  }, [orgLoading, load]);

  if (loading || orgLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  const total = stock.reduce((s, r) => s + Number(r.quantity_available ?? 0), 0);

  return (
    <>
      <PageHeader
        title={t("v2.production.fg.title")}
        description={t("v2.production.fg.description", { count: stock.length, quantity: total.toFixed(2) })}
      />

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">{t("v2.production.fg.tabs.stock")}</TabsTrigger>
          <TabsTrigger value="ledger">{t("v2.production.fg.tabs.ledger")}</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="mt-4 space-y-3">
          {stock.length === 0 ? (
            <EmptyState icon={PackageCheck} title={t("v2.production.fg.emptyTitle")} description={t("v2.production.fg.emptyDescription")} />
          ) : (
            stock.map((r) => (
              <button
                key={r.finished_batch_id}
                type="button"
                onClick={() => navigate(`/app/operations/finished-goods/${r.finished_batch_id}`)}
                className="w-full rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{r.product_name ?? "—"}</p>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {r.batch_reference} · {r.production_reference} ·{" "}
                      {new Date(r.production_date).toLocaleDateString(localeTag(i18n.language))}
                      {r.storage_location ? ` · ${r.storage_location}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold text-primary">
                      {Number(r.quantity_available ?? 0).toFixed(2)} {r.unit_code}
                    </span>
                    <StatusBadge label={t(`v2.production.fgStatus.${r.status}`, { defaultValue: r.status })} tone={FG_TONE[r.status] ?? "neutral"} />
                  </div>
                </div>
              </button>
            ))
          )}
        </TabsContent>

        <TabsContent value="ledger" className="mt-4 space-y-2">
          {movements.length === 0 ? (
            <EmptyState icon={PackageCheck} title={t("v2.production.fg.noMovements")} />
          ) : (
            movements.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-2 text-sm">
                <span className="text-muted-foreground">{new Date(m.created_at).toLocaleString(localeTag(i18n.language))}</span>
                <span>{t(`v2.production.fgMovement.${m.movement_type}`, { defaultValue: m.movement_type })}</span>
                <span className={Number(m.quantity) >= 0 ? "font-medium text-primary" : "font-medium text-destructive"}>
                  {Number(m.quantity) >= 0 ? "+" : ""}
                  {Number(m.quantity).toFixed(2)} {m.unit_code}
                </span>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </>
  );
};

export default V2FinishedGoods;
