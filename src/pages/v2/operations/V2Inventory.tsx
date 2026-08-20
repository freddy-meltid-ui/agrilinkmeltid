// AGRI-GRID V2 — Phase 1E: raw-material inventory. Stock is a ledger derived from
// goods receipts; it never comes from confirmations or orders.
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Boxes, Loader2 } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrganization } from "@/hooks/v2/useOrganization";
import {
  fetchBatches,
  fetchInventoryBalance,
  fetchMovements,
  type InventoryBalanceRow,
  type InventoryMovement,
  type RawMaterialBatch,
} from "@/lib/v2/procurement";
import { localeTag } from "@/lib/v2/locale";
import { traceRawBatch, type ForwardTrace } from "@/lib/v2/production";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const V2Inventory = () => {
  const { t, i18n } = useTranslation();
  const fr = i18n.language.startsWith("fr");
  const { activeOrg, loading: orgLoading } = useOrganization();
  const [balance, setBalance] = useState<InventoryBalanceRow[]>([]);
  const [batches, setBatches] = useState<RawMaterialBatch[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [forward, setForward] = useState<ForwardTrace | null>(null);
  const [traceOpen, setTraceOpen] = useState(false);

  // Forward traceability: which finished lots came out of this raw-material batch.
  const openForwardTrace = async (rawBatchId: string) => {
    setForward(null);
    setTraceOpen(true);
    try {
      setForward(await traceRawBatch(rawBatchId));
    } catch {
      setForward(null);
    }
  };

  const load = useCallback(async () => {
    if (!activeOrg) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [b, ba, m] = await Promise.all([
      fetchInventoryBalance(activeOrg.id),
      fetchBatches(activeOrg.id),
      fetchMovements(activeOrg.id),
    ]);
    setBalance(b);
    setBatches(ba);
    setMovements(m);
    setLoading(false);
  }, [activeOrg]);

  useEffect(() => {
    if (!orgLoading) load();
  }, [orgLoading, load]);

  if (loading || orgLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  const total = balance.reduce((s, r) => s + Number(r.balance_tonnes ?? 0), 0);

  return (
    <>
      <PageHeader
        title={t("v2.procurement.inventory.title")}
        description={t("v2.procurement.inventory.description", { tonnes: total.toFixed(2) })}
      />

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">{t("v2.procurement.inventory.tabs.stock")}</TabsTrigger>
          <TabsTrigger value="batches">{t("v2.procurement.inventory.tabs.batches", { count: batches.length })}</TabsTrigger>
          <TabsTrigger value="ledger">{t("v2.procurement.inventory.tabs.ledger")}</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="mt-4 space-y-3">
          {balance.length === 0 ? (
            <EmptyState icon={Boxes} title={t("v2.procurement.inventory.emptyTitle")} description={t("v2.procurement.inventory.emptyDescription")} />
          ) : (
            balance.map((r) => (
              <div key={`${r.crop_id}-${r.variety_id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
                <div>
                  <p className="font-medium">
                    {(fr ? r.crop_name_fr : r.crop_name_en) ?? "—"}
                    {r.variety_id ? ` — ${(fr ? r.variety_name_fr : r.variety_name_en) ?? ""}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("v2.procurement.inventory.batchCount", { count: Number(r.batch_count ?? 0) })}
                    {r.last_movement_at ? ` · ${new Date(r.last_movement_at).toLocaleDateString(localeTag(i18n.language))}` : ""}
                  </p>
                </div>
                <p className="text-xl font-semibold text-primary">{Number(r.balance_tonnes ?? 0).toFixed(2)} t</p>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="batches" className="mt-4 space-y-3">
          {batches.length === 0 ? (
            <EmptyState icon={Boxes} title={t("v2.procurement.inventory.noBatches")} />
          ) : (
            batches.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => openForwardTrace(b.id)}
                className="w-full rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs">{b.batch_reference}</span>
                  <span className="font-medium">{Number(b.current_tonnes).toFixed(2)} t</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("v2.procurement.inventory.batchTrace", {
                    date: new Date(b.receipt_date).toLocaleDateString(localeTag(i18n.language)),
                    quality: t(`v2.procurement.quality.${b.quality_status}`, { defaultValue: b.quality_status }),
                    storage: b.storage_location ?? "—",
                  })}
                </p>
              </button>
            ))
          )}
        </TabsContent>

        <TabsContent value="ledger" className="mt-4 space-y-2">
          {movements.length === 0 ? (
            <EmptyState icon={Boxes} title={t("v2.procurement.inventory.noMovements")} />
          ) : (
            movements.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-2 text-sm">
                <span className="text-muted-foreground">{new Date(m.created_at).toLocaleString(localeTag(i18n.language))}</span>
                <span>{t(`v2.procurement.movement.${m.movement_type}`, { defaultValue: m.movement_type })}</span>
                <span className={Number(m.quantity_tonnes) >= 0 ? "font-medium text-primary" : "font-medium text-destructive"}>
                  {Number(m.quantity_tonnes) >= 0 ? "+" : ""}
                  {Number(m.quantity_tonnes).toFixed(2)} t
                </span>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={traceOpen} onOpenChange={setTraceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("v2.production.trace.forwardTitle")}</DialogTitle>
            <DialogDescription>{t("v2.production.trace.forwardDescription")}</DialogDescription>
          </DialogHeader>
          {!forward ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : forward.productions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("v2.production.trace.forwardEmpty")}</p>
          ) : (
            <div className="space-y-3">
              {forward.productions.map((p) => (
                <div key={p.production_batch_id} className="rounded-md border border-border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs">{p.production_reference}</span>
                    <span>{Number(p.quantity_tonnes).toFixed(3)} t</span>
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {p.finished_batches.map((f) => (
                      <li key={f.id}>
                        {f.reference} — {f.product ?? "—"} · {Number(f.quantity).toFixed(2)} {f.unit_code}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default V2Inventory;
