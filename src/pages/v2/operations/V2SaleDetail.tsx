// AGRI-GRID V2 — Phase 2B: sale detail — lines, reserved lots, dispatches,
// payments and traceability.
//
// Rules surfaced here:
//  * Reserving stock (confirmation) never changes physical inventory; only a
//    posted dispatch does.
//  * Cancelling releases undispatched reservations and keeps the order row.
//  * Reversing a dispatch writes a compensating stock movement — no deletion.
//  * Overpayment is blocked by the database.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Ban, Coins, Loader2, PackageCheck, Truck, Undo2 } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import KpiCard from "@/components/v2/ui-kit/KpiCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  PAYMENT_METHODS,
  PAYMENT_TONE,
  SALES_TONE,
  cancelSalesOrder,
  confirmSalesOrder,
  fetchSalesOrderDetail,
  formatMoney,
  parseSalesError,
  postDispatch,
  recordCustomerPayment,
  reverseCustomerPayment,
  reverseDispatch,
  type PaymentMethod,
  type SalesOrderDetail,
} from "@/lib/v2/sales";
import { localeTag } from "@/lib/v2/locale";

const V2SaleDetail = () => {
  const { t, i18n } = useTranslation();
  const { saleId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const loc = localeTag(i18n.language);

  const [detail, setDetail] = useState<SalesOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [dispatchQty, setDispatchQty] = useState<Record<string, string>>({});
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("cash");
  const [payRef, setPayRef] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const load = useCallback(async () => {
    if (!saleId) return;
    setLoading(true);
    setDetail(await fetchSalesOrderDetail(saleId));
    setLoading(false);
  }, [saleId]);

  useEffect(() => {
    load();
  }, [load]);

  const outstandingAmount = useMemo(
    () => (detail ? Number(detail.order.total_amount) - Number(detail.order.paid_amount) : 0),
    [detail],
  );

  const openDispatch = () => {
    if (!detail) return;
    const initial: Record<string, string> = {};
    for (const a of detail.allocations) {
      const rem = Number(a.quantity) - Number(a.dispatched_quantity) - Number(a.released_quantity);
      if (rem > 0) initial[a.id] = String(rem);
    }
    setDispatchQty(initial);
    setDispatchOpen(true);
  };

  const run = async (fn: () => Promise<unknown>, successKey: string) => {
    setBusy(true);
    try {
      await fn();
      toast({ title: t(successKey) });
      setDispatchOpen(false);
      setPayOpen(false);
      setCancelOpen(false);
      await load();
    } catch (e) {
      const err = parseSalesError((e as Error).message);
      toast({
        title: t("v2.common.error"),
        description: t(`v2.sales.errors.${err.code}`, { defaultValue: err.raw, value: err.value ?? "" }),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  if (!detail) return <p className="text-sm text-muted-foreground">{t("v2.sales.detail.notFound")}</p>;

  const { order, lines, allocations, dispatches, payments } = detail;
  const canConfirm = order.status === "draft";
  const canDispatch = order.status === "confirmed" || order.status === "partially_fulfilled";
  const canCancel = order.status !== "cancelled" && order.status !== "fulfilled";

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-2" onClick={() => navigate("/app/operations/sales")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t("v2.sales.detail.back")}
      </Button>

      <PageHeader
        title={`${order.sales_reference} · ${order.customer?.display_name ?? "—"}`}
        description={t("v2.sales.detail.description", {
          date: new Date(order.order_date).toLocaleDateString(loc),
          type: order.customer ? t(`v2.sales.customerType.${order.customer.customer_type}`) : "—",
        })}
        actions={
          <div className="flex flex-wrap gap-2">
            {canConfirm && (
              <Button disabled={busy} onClick={() => run(() => confirmSalesOrder(order.id), "v2.sales.detail.confirmed")}>
                <PackageCheck className="mr-2 h-4 w-4" />
                {t("v2.sales.detail.confirm")}
              </Button>
            )}
            {canDispatch && (
              <Button disabled={busy} onClick={openDispatch}>
                <Truck className="mr-2 h-4 w-4" />
                {t("v2.sales.detail.dispatch")}
              </Button>
            )}
            {order.status !== "cancelled" && outstandingAmount > 0 && (
              <Button variant="outline" disabled={busy} onClick={() => { setPayAmount(String(outstandingAmount)); setPayOpen(true); }}>
                <Coins className="mr-2 h-4 w-4" />
                {t("v2.sales.detail.recordPayment")}
              </Button>
            )}
            {canCancel && (
              <Button variant="ghost" disabled={busy} onClick={() => setCancelOpen(true)}>
                <Ban className="mr-2 h-4 w-4" />
                {t("v2.sales.detail.cancel")}
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <StatusBadge label={t(`v2.sales.status.${order.status}`)} tone={SALES_TONE[order.status] ?? "neutral"} />
        <StatusBadge label={t(`v2.sales.paymentStatus.${order.payment_status}`)} tone={PAYMENT_TONE[order.payment_status] ?? "neutral"} />
        {order.cancellation_reason && (
          <span className="text-xs text-muted-foreground">
            {t("v2.sales.detail.cancelledOn", {
              date: order.cancelled_at ? new Date(order.cancelled_at).toLocaleDateString(loc) : "—",
              reason: order.cancellation_reason,
            })}
          </span>
        )}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <KpiCard label={t("v2.sales.detail.salesValue")} value={formatMoney(Number(order.total_amount), order.currency, loc)} icon={PackageCheck} />
        <KpiCard label={t("v2.sales.detail.received")} value={formatMoney(Number(order.paid_amount), order.currency, loc)} icon={Coins} />
        <KpiCard label={t("v2.sales.detail.outstanding")} value={formatMoney(outstandingAmount, order.currency, loc)} icon={Coins} />
      </div>

      {/* lines */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold">{t("v2.sales.detail.lines")}</h2>
        <div className="space-y-2">
          {lines.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-4">
              <div>
                <p className="font-medium">{l.product?.product_name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {Number(l.quantity).toFixed(2)} {l.unit_code} × {formatMoney(Number(l.unit_price), order.currency, loc)}
                  {Number(l.discount_amount) > 0 ? ` − ${formatMoney(Number(l.discount_amount), order.currency, loc)}` : ""}
                  {" · "}
                  {t("v2.sales.detail.dispatched", {
                    dispatched: Number(l.dispatched_quantity).toFixed(2),
                    total: Number(l.quantity).toFixed(2),
                    unit: l.unit_code,
                  })}
                </p>
              </div>
              <span className="font-medium">{formatMoney(Number(l.line_total), order.currency, loc)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* allocations */}
      {allocations.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold">{t("v2.sales.detail.allocations")}</h2>
          <div className="space-y-2">
            {allocations.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm">
                <button
                  type="button"
                  className="font-mono text-xs underline-offset-2 hover:underline"
                  onClick={() => navigate(`/app/operations/finished-goods/${a.finished_batch_id}`)}
                >
                  {a.batch?.batch_reference ?? a.finished_batch_id.slice(0, 8)}
                </button>
                <span className="text-muted-foreground">
                  {t("v2.sales.detail.allocationLine", {
                    reserved: (Number(a.quantity) - Number(a.dispatched_quantity) - Number(a.released_quantity)).toFixed(2),
                    dispatched: Number(a.dispatched_quantity).toFixed(2),
                    unit: a.unit_code,
                  })}
                </span>
                <StatusBadge label={t(`v2.sales.allocationStatus.${a.status}`)} tone={a.status === "released" ? "neutral" : "info"} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* dispatches */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold">{t("v2.sales.detail.dispatches")}</h2>
        {dispatches.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("v2.sales.detail.noDispatch")}</p>
        ) : (
          <div className="space-y-2">
            {dispatches.map((d) => (
              <div key={d.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{d.dispatch_reference}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(d.dispatch_date).toLocaleDateString(loc)} ·{" "}
                      {d.lines.reduce((s, l) => s + Number(l.quantity), 0).toFixed(2)} {d.lines[0]?.unit_code ?? ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      label={t(`v2.sales.dispatchStatus.${d.status}`)}
                      tone={d.status === "posted" ? "success" : "danger"}
                    />
                    {d.status === "posted" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => run(() => reverseDispatch(d.id, t("v2.sales.detail.reversalReason")), "v2.sales.detail.reversed")}
                      >
                        <Undo2 className="mr-2 h-4 w-4" />
                        {t("v2.sales.detail.reverse")}
                      </Button>
                    )}
                  </div>
                </div>
                {d.reversal_reason && <p className="mt-1 text-xs text-muted-foreground">{d.reversal_reason}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* payments */}
      <section className="mb-10">
        <h2 className="mb-2 text-sm font-semibold">{t("v2.sales.detail.payments")}</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("v2.sales.detail.noPayment")}</p>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm">
                <span className="text-muted-foreground">{new Date(p.payment_date).toLocaleDateString(loc)}</span>
                <span>{t(`v2.sales.methods.${p.payment_method}`)}</span>
                <span className={p.is_reversal ? "font-medium text-destructive" : "font-medium text-primary"}>
                  {p.is_reversal ? "−" : "+"}
                  {formatMoney(Number(p.amount), p.currency, loc)}
                </span>
                {!p.is_reversal && !p.reversed_at && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => run(() => reverseCustomerPayment(p.id, t("v2.sales.detail.reversalReason")), "v2.sales.detail.paymentReversed")}
                  >
                    {t("v2.sales.detail.reverse")}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">{t("v2.sales.detail.paymentNote")}</p>
      </section>

      {/* ---------------------------------------------------------- dialogs */}
      <Dialog open={dispatchOpen} onOpenChange={setDispatchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("v2.sales.detail.dispatch")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {allocations
              .filter((a) => Number(a.quantity) - Number(a.dispatched_quantity) - Number(a.released_quantity) > 0)
              .map((a) => (
                <div key={a.id}>
                  <Label>
                    {a.batch?.batch_reference ?? a.finished_batch_id.slice(0, 8)} ({a.unit_code})
                  </Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={dispatchQty[a.id] ?? ""}
                    onChange={(e) => setDispatchQty({ ...dispatchQty, [a.id]: e.target.value })}
                  />
                </div>
              ))}
            <p className="text-xs text-muted-foreground">{t("v2.sales.detail.dispatchHint")}</p>
          </div>
          <DialogFooter>
            <Button
              disabled={busy}
              onClick={() =>
                run(
                  () =>
                    postDispatch({
                      salesOrderId: order.id,
                      lines: Object.entries(dispatchQty)
                        .filter(([, v]) => Number(v) > 0)
                        .map(([allocation_id, v]) => ({ allocation_id, quantity: Number(v) })),
                    }),
                  "v2.sales.detail.dispatchPosted",
                )
              }
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("v2.sales.detail.postDispatch")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("v2.sales.detail.recordPayment")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t("v2.sales.detail.amount")}</Label>
              <Input type="number" inputMode="decimal" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
              <p className="mt-1 text-xs text-muted-foreground">
                {t("v2.sales.detail.outstandingHint", { amount: formatMoney(outstandingAmount, order.currency, loc) })}
              </p>
            </div>
            <div>
              <Label>{t("v2.sales.detail.method")}</Label>
              <Select value={payMethod} onValueChange={(v) => setPayMethod(v as PaymentMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {t(`v2.sales.methods.${m}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("v2.sales.detail.reference")}</Label>
              <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={busy || !(Number(payAmount) > 0)}
              onClick={() =>
                run(
                  () =>
                    recordCustomerPayment({
                      salesOrderId: order.id,
                      amount: Number(payAmount),
                      method: payMethod,
                      reference: payRef || null,
                    }),
                  "v2.sales.detail.paymentRecorded",
                )
              }
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("v2.common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("v2.sales.detail.cancel")}</DialogTitle>
          </DialogHeader>
          <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder={t("v2.sales.detail.cancelReason")} />
          <p className="text-xs text-muted-foreground">{t("v2.sales.detail.cancelHint")}</p>
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={busy || !cancelReason.trim()}
              onClick={() => run(() => cancelSalesOrder(order.id, cancelReason.trim()), "v2.sales.detail.cancelled")}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("v2.sales.detail.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default V2SaleDetail;
