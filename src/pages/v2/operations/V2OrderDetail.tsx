// AGRI-GRID V2 — Phase 1E: procurement order detail — deliveries, goods receipt,
// traceable batches. Inventory is only ever posted by the receipt RPC.
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Ban, Loader2, PackageCheck, Plus, Truck } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  cancelProcurementOrder,
  createDelivery,
  DELIVERY_TONE,
  fetchOrderBundle,
  fetchSupplierContact,
  ORDER_TONE,
  outstandingTonnes,
  parseProcurementError,
  receiptOutcome,
  receiveGoods,
  setDeliveryStatus,
  type Delivery,
  type OrderBundle,
} from "@/lib/v2/procurement";
import { localeTag } from "@/lib/v2/locale";

const V2OrderDetail = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bundle, setBundle] = useState<OrderBundle | null>(null);
  const [contact, setContact] = useState<{ display_name: string | null; phone: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [planOpen, setPlanOpen] = useState(false);
  const [plan, setPlan] = useState({ date: "", quantity: "", notes: "" });

  const [receiptFor, setReceiptFor] = useState<Delivery | null>(null);
  const [receipt, setReceipt] = useState({
    delivered: "",
    accepted: "",
    rejected: "0",
    grade: "",
    condition: "",
    notes: "",
    storage: "",
    overDelivery: false,
  });

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    const b = await fetchOrderBundle(orderId);
    setBundle(b);
    if (b) {
      const c = await fetchSupplierContact(b.order.supplier_id, b.order.organization_id);
      setContact(c ? { display_name: c.display_name, phone: c.phone } : null);
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const fail = (e: unknown) => {
    const message = e instanceof Error ? e.message : String(e);
    const parsed = parseProcurementError(message);
    toast({
      title: t(`v2.procurement.error.${parsed.code}`, { value: parsed.value ?? "", defaultValue: message }),
      variant: "destructive",
    });
  };

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  if (!bundle) return <EmptyState icon={PackageCheck} title={t("v2.procurement.order.notFound")} />;

  const { order, lines, deliveries, receipts, batches } = bundle;
  const line = lines[0];
  const outstanding = outstandingTonnes(line);
  const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString(localeTag(i18n.language)) : "—");

  const planDelivery = async () => {
    setBusy(true);
    try {
      await createDelivery({
        order,
        scheduledDate: plan.date || null,
        declaredQuantity: plan.quantity ? Number(plan.quantity) : null,
        unitCode: line?.unit_code ?? "t",
        notes: plan.notes || null,
        userId: user!.id,
      });
      setPlanOpen(false);
      setPlan({ date: "", quantity: "", notes: "" });
      await load();
      toast({ title: t("v2.procurement.delivery.created") });
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const postReceipt = async () => {
    if (!receiptFor) return;
    const delivered = Number(receipt.delivered);
    const accepted = Number(receipt.accepted);
    const rejected = Number(receipt.rejected || 0);
    setBusy(true);
    try {
      await receiveGoods({
        deliveryId: receiptFor.id,
        deliveredQuantity: delivered,
        acceptedQuantity: accepted,
        rejectedQuantity: rejected,
        unitCode: receiptFor.unit_code ?? "t",
        qualityResult: receiptOutcome(delivered, accepted, rejected),
        qualityGrade: receipt.grade || null,
        conditionNotes: receipt.condition || null,
        receivingNotes: receipt.notes || null,
        acceptOverDelivery: receipt.overDelivery,
        storageLocation: receipt.storage || null,
      });
      setReceiptFor(null);
      await load();
      toast({ title: t("v2.procurement.receipt.posted") });
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-2" onClick={() => navigate("/app/operations")}>
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        {t("v2.procurement.order.back")}
      </Button>

      <PageHeader
        title={order.order_number}
        description={t("v2.procurement.order.subtitle", {
          tonnes: Number(line?.ordered_tonnes ?? 0).toFixed(2),
          from: fmtDate(order.expected_delivery_start),
          to: fmtDate(order.expected_delivery_end),
          location: order.delivery_location ?? "—",
        })}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge label={t(`v2.procurement.orderStatus.${order.status}`, { defaultValue: order.status })} tone={ORDER_TONE[order.status] ?? "neutral"} />
            {!["delivered", "cancelled"].includes(order.status) && (
              <Button variant="ghost" size="sm" onClick={async () => {
                try {
                  await cancelProcurementOrder(order.id, t("v2.procurement.order.cancelReason"));
                  await load();
                } catch (e) {
                  fail(e);
                }
              }}>
                <Ban className="mr-1.5 h-4 w-4" />
                {t("v2.procurement.order.cancel")}
              </Button>
            )}
          </div>
        }
      />

      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("v2.procurement.order.supplier")}</p>
            <p className="mt-1 font-medium">{contact?.display_name ?? "—"}</p>
            <p className="text-sm text-muted-foreground">{contact?.phone ?? ""}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("v2.procurement.order.ordered")}</p>
            <p className="mt-1 text-xl font-semibold">{Number(line?.ordered_tonnes ?? 0).toFixed(2)} t</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("v2.procurement.order.accepted")}</p>
            <p className="mt-1 text-xl font-semibold text-primary">{Number(line?.accepted_tonnes ?? 0).toFixed(2)} t</p>
            <p className="text-xs text-muted-foreground">{t("v2.procurement.order.outstanding", { tonnes: outstanding.toFixed(2) })}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("v2.procurement.order.price")}</p>
            <p className="mt-1 font-medium">
              {line?.agreed_unit_price != null
                ? `${Number(line.agreed_unit_price).toLocaleString(localeTag(i18n.language))} ${order.currency}/${line.price_unit ?? line.unit_code}`
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {order.total_expected_amount != null
                ? `${Number(order.total_expected_amount).toLocaleString(localeTag(i18n.language))} ${order.currency}`
                : ""}
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium">{t("v2.procurement.delivery.title")}</h2>
            {!["delivered", "cancelled"].includes(order.status) && (
              <Button size="sm" variant="outline" onClick={() => setPlanOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                {t("v2.procurement.delivery.plan")}
              </Button>
            )}
          </div>

          {deliveries.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("v2.procurement.delivery.empty")}</p>
          ) : (
            <ul className="space-y-3">
              {deliveries.map((d) => (
                <li key={d.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{d.reference}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("v2.procurement.delivery.scheduled", { date: fmtDate(d.scheduled_date) })}
                        {d.declared_quantity != null ? ` · ${Number(d.declared_quantity)} ${d.unit_code}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge label={t(`v2.procurement.deliveryStatus.${d.status}`, { defaultValue: d.status })} tone={DELIVERY_TONE[d.status] ?? "neutral"} />
                      {["scheduled"].includes(d.status) && (
                        <Button size="sm" variant="ghost" onClick={async () => { await setDeliveryStatus(d.id, "in_transit"); await load(); }}>
                          <Truck className="mr-1.5 h-4 w-4" />
                          {t("v2.procurement.delivery.markInTransit")}
                        </Button>
                      )}
                      {["scheduled", "in_transit", "arrived"].includes(d.status) && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setReceipt({
                              delivered: d.declared_quantity != null ? String(d.declared_quantity) : "",
                              accepted: d.declared_quantity != null ? String(d.declared_quantity) : "",
                              rejected: "0",
                              grade: "",
                              condition: "",
                              notes: "",
                              storage: "",
                              overDelivery: false,
                            });
                            setReceiptFor(d);
                          }}
                        >
                          <PackageCheck className="mr-1.5 h-4 w-4" />
                          {t("v2.procurement.receipt.cta")}
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {receipts.length > 0 && (
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-4 font-medium">{t("v2.procurement.receipt.history")}</h2>
            <ul className="space-y-3 text-sm">
              {receipts.map((r) => (
                <li key={r.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{r.reference}</span>
                    <span className="text-xs text-muted-foreground">{new Date(r.received_at).toLocaleString(localeTag(i18n.language))}</span>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {t("v2.procurement.receipt.summary", {
                      delivered: Number(r.delivered_tonnes).toFixed(2),
                      accepted: Number(r.accepted_tonnes).toFixed(2),
                      rejected: Number(r.rejected_tonnes).toFixed(2),
                      quality: t(`v2.procurement.quality.${r.quality_result}`, { defaultValue: r.quality_result }),
                    })}
                  </p>
                  {r.over_delivery_tonnes > 0 && (
                    <p className="mt-1 text-xs text-accent-foreground">
                      {t("v2.procurement.receipt.overDeliveryNote", { tonnes: Number(r.over_delivery_tonnes).toFixed(2) })}
                    </p>
                  )}
                  {r.condition_notes && <p className="mt-1 text-xs text-muted-foreground">{r.condition_notes}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {batches.length > 0 && (
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-4 font-medium">{t("v2.procurement.batches.title")}</h2>
            <ul className="space-y-2 text-sm">
              {batches.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3">
                  <span className="font-mono text-xs">{b.batch_reference}</span>
                  <span>{Number(b.current_tonnes).toFixed(2)} t</span>
                  <span className="text-xs text-muted-foreground">
                    {t("v2.procurement.batches.trace", {
                      date: fmtDate(b.receipt_date),
                      storage: b.storage_location ?? "—",
                    })}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">{t("v2.procurement.batches.traceHint")}</p>
          </section>
        )}
      </div>

      {/* plan a delivery */}
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("v2.procurement.delivery.plan")}</DialogTitle>
            <DialogDescription>{t("v2.procurement.delivery.planHint", { tonnes: outstanding.toFixed(2) })}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="dl-date">{t("v2.procurement.delivery.date")}</Label>
              <Input id="dl-date" type="date" className="mt-1" value={plan.date} onChange={(e) => setPlan((p) => ({ ...p, date: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="dl-qty">{t("v2.procurement.delivery.quantity")}</Label>
              <Input id="dl-qty" type="number" step="0.01" className="mt-1" value={plan.quantity} onChange={(e) => setPlan((p) => ({ ...p, quantity: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="dl-notes">{t("v2.procurement.delivery.notes")}</Label>
              <Textarea id="dl-notes" rows={2} className="mt-1" value={plan.notes} onChange={(e) => setPlan((p) => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanOpen(false)}>{t("common.cancel", { defaultValue: "Cancel" })}</Button>
            <Button onClick={planDelivery} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("v2.procurement.delivery.confirmPlan")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* goods receipt */}
      <Dialog open={!!receiptFor} onOpenChange={(v) => !v && setReceiptFor(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("v2.procurement.receipt.title")}</DialogTitle>
            <DialogDescription>{t("v2.procurement.receipt.description", { reference: receiptFor?.reference ?? "" })}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="gr-delivered">{t("v2.procurement.receipt.delivered")}</Label>
              <Input id="gr-delivered" type="number" step="0.01" className="mt-1" value={receipt.delivered} onChange={(e) => setReceipt((r) => ({ ...r, delivered: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="gr-accepted">{t("v2.procurement.receipt.accepted")}</Label>
              <Input id="gr-accepted" type="number" step="0.01" className="mt-1" value={receipt.accepted} onChange={(e) => setReceipt((r) => ({ ...r, accepted: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="gr-rejected">{t("v2.procurement.receipt.rejected")}</Label>
              <Input id="gr-rejected" type="number" step="0.01" className="mt-1" value={receipt.rejected} onChange={(e) => setReceipt((r) => ({ ...r, rejected: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="gr-grade">{t("v2.procurement.receipt.grade")}</Label>
              <Input id="gr-grade" className="mt-1" value={receipt.grade} onChange={(e) => setReceipt((r) => ({ ...r, grade: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="gr-storage">{t("v2.procurement.receipt.storage")}</Label>
              <Input id="gr-storage" className="mt-1" value={receipt.storage} onChange={(e) => setReceipt((r) => ({ ...r, storage: e.target.value }))} />
            </div>
            <div className="sm:col-span-3">
              <Label htmlFor="gr-condition">{t("v2.procurement.receipt.condition")}</Label>
              <Textarea id="gr-condition" rows={2} className="mt-1" value={receipt.condition} onChange={(e) => setReceipt((r) => ({ ...r, condition: e.target.value }))} />
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={receipt.overDelivery} onCheckedChange={(v) => setReceipt((r) => ({ ...r, overDelivery: v === true }))} />
            <span>{t("v2.procurement.receipt.acceptOverDelivery", { tonnes: outstanding.toFixed(2) })}</span>
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiptFor(null)}>{t("common.cancel", { defaultValue: "Cancel" })}</Button>
            <Button onClick={postReceipt} disabled={busy || !receipt.delivered}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("v2.procurement.receipt.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default V2OrderDetail;
