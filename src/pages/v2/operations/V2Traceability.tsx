// AGRI-GRID V2 — Phase 2A/2B: full traceability for one finished lot.
// Backward: finished batch → production batch → raw batches → receipts/orders → suppliers.
// Forward (Phase 2B): finished batch → dispatches → customers ("where did this lot go?").
// Supplier identity is only shown when the commercial relationship released it.
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2, ShieldAlert } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import { Button } from "@/components/ui/button";
import { traceFinishedBatch, type BackwardTrace } from "@/lib/v2/production";
import {
  fetchDirectCost,
  formatMoney,
  traceFinishedBatchCustomers,
  type DirectCost,
  type LotDestinations,
} from "@/lib/v2/sales";
import { localeTag } from "@/lib/v2/locale";

const V2Traceability = () => {
  const { finishedBatchId } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [trace, setTrace] = useState<BackwardTrace | null>(null);
  const [downstream, setDownstream] = useState<LotDestinations | null>(null);
  const [cost, setCost] = useState<DirectCost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!finishedBatchId) return;
    setLoading(true);
    try {
      const [b, d, c] = await Promise.all([
        traceFinishedBatch(finishedBatchId),
        traceFinishedBatchCustomers(finishedBatchId).catch(() => null),
        fetchDirectCost(finishedBatchId).catch(() => null),
      ]);
      setTrace(b);
      setDownstream(d);
      setCost(c);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [finishedBatchId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  if (error || !trace) return <p className="text-muted-foreground">{t("v2.production.trace.unavailable")}</p>;


  const locale = localeTag(i18n.language);
  const fb = trace.finished_batch;
  const pb = trace.production_batch;

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-3" onClick={() => navigate("/app/operations/finished-goods")}>
        <ArrowLeft className="mr-1 h-4 w-4" />
        {t("v2.production.fg.title")}
      </Button>

      <PageHeader
        title={t("v2.production.trace.title", { reference: fb.reference })}
        description={t("v2.production.trace.description", {
          product: fb.product ?? "—",
          quantity: `${Number(fb.quantity).toFixed(2)} ${fb.unit_code}`,
          date: new Date(fb.production_date).toLocaleDateString(locale),
        })}
      />

      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("v2.production.trace.productionStep")}</p>
          <p className="mt-1 font-mono text-sm">{pb.reference}</p>
          <p className="text-xs text-muted-foreground">
            {t("v2.production.trace.consumed", { tonnes: Number(pb.total_input_tonnes).toFixed(3) })}
            {pb.notes ? ` · ${pb.notes}` : ""}
          </p>
        </div>

        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {t("v2.production.trace.originSteps", { count: trace.inputs.length })}
        </p>

        {trace.inputs.map((i) => (
          <div key={i.raw_batch_id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs">{i.raw_batch_reference}</span>
              <span className="font-medium">{Number(i.quantity_tonnes).toFixed(3)} t</span>
            </div>
            <p className="mt-1 text-sm">
              {i.crop ?? "—"}
              {i.variety ? ` · ${i.variety}` : ""}
            </p>
            <dl className="mt-3 grid gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
              <div>
                <dt className="inline">{t("v2.production.trace.supplier")}: </dt>
                <dd className="inline text-foreground">
                  {i.supplier?.contact_released ? i.supplier.display_name : t("v2.production.trace.supplierHidden")}
                  {i.supplier?.code ? ` (${i.supplier.code})` : ""}
                </dd>
              </div>
              <div>
                <dt className="inline">{t("v2.production.trace.origin")}: </dt>
                <dd className="inline text-foreground">
                  {[i.supplier?.commune, i.supplier?.department].filter(Boolean).join(", ") || "—"}
                </dd>
              </div>
              <div>
                <dt className="inline">{t("v2.production.trace.receipt")}: </dt>
                <dd className="inline text-foreground">
                  {i.receipt_reference ?? "—"}
                  {i.receipt_date ? ` · ${new Date(i.receipt_date).toLocaleDateString(locale)}` : ""}
                </dd>
              </div>
              <div>
                <dt className="inline">{t("v2.production.trace.order")}: </dt>
                <dd className="inline text-foreground">
                  {i.order_number ?? "—"}
                  {i.delivery_reference ? ` · ${i.delivery_reference}` : ""}
                </dd>
              </div>
            </dl>
            {!i.supplier?.contact_released && (
              <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldAlert className="h-3.5 w-3.5" />
                {t("v2.production.trace.privacyNote")}
              </p>
            )}
          </div>
        ))}
      </div>
    </>
  );
};

export default V2Traceability;
