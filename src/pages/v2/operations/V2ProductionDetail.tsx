// AGRI-GRID V2 — Phase 2A: production batch detail, yield, and reversal.
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import KpiCard from "@/components/v2/ui-kit/KpiCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  fetchProductionDetail,
  parseProductionError,
  PRODUCTION_TONE,
  voidProduction,
  type ProductionDetail,
} from "@/lib/v2/production";
import { localeTag } from "@/lib/v2/locale";

const V2ProductionDetail = () => {
  const { batchId } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<ProductionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!batchId) return;
    setLoading(true);
    setDetail(await fetchProductionDetail(batchId));
    setLoading(false);
  }, [batchId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  if (!detail) return <p className="text-muted-foreground">{t("v2.production.notFound")}</p>;

  const { batch, inputs, outputs, finished } = detail;
  const fr = i18n.language.startsWith("fr");
  const finishedQty = outputs.filter((o) => o.output_type === "finished_product").reduce((s, o) => s + Number(o.quantity), 0);
  const lossQty = outputs
    .filter((o) => o.output_type === "waste" || o.output_type === "rejected_output")
    .reduce((s, o) => s + Number(o.quantity), 0);
  const inputKg = Number(batch.total_input_tonnes) * 1000;
  const yieldPct = inputKg > 0 ? (finishedQty / inputKg) * 100 : 0;
  const lossPct = inputKg > 0 ? (lossQty / inputKg) * 100 : 0;

  const doVoid = async () => {
    if (!batchId) return;
    setVoiding(true);
    try {
      await voidProduction(batchId, reason || "—");
      toast.success(t("v2.production.voided"));
      setOpen(false);
      await load();
    } catch (e) {
      const failure = parseProductionError((e as Error).message ?? "");
      toast.error(t(`v2.production.error.${failure.code}`, { defaultValue: t("v2.production.error.UNKNOWN"), value: failure.value ?? "" }));
    } finally {
      setVoiding(false);
    }
  };

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-3" onClick={() => navigate("/app/operations/production")}>
        <ArrowLeft className="mr-1 h-4 w-4" />
        {t("v2.production.title")}
      </Button>

      <PageHeader
        title={batch.batch_reference}
        description={`${batch.product?.product_name ?? "—"} · ${new Date(batch.production_date).toLocaleDateString(
          localeTag(i18n.language),
        )}${batch.facility?.name ? ` · ${batch.facility.name}` : ""}`}
        actions={
          <>
            <StatusBadge label={t(`v2.production.status.${batch.status}`, { defaultValue: batch.status })} tone={PRODUCTION_TONE[batch.status] ?? "neutral"} />
            {batch.status === "completed" && (
              <Button variant="outline" onClick={() => setOpen(true)}>
                <Undo2 className="mr-2 h-4 w-4" />
                {t("v2.production.voidCta")}
              </Button>
            )}
          </>
        }
      />

      {batch.status === "voided" && (
        <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          {t("v2.production.voidedBanner", {
            date: batch.voided_at ? new Date(batch.voided_at).toLocaleString(localeTag(i18n.language)) : "—",
            reason: batch.void_reason ?? "—",
          })}
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={t("v2.production.kpi.consumed")} value={`${Number(batch.total_input_tonnes).toFixed(3)} t`} />
        <KpiCard label={t("v2.production.kpi.produced")} value={finishedQty.toFixed(2)} />
        <KpiCard label={t("v2.production.kpi.yield")} value={`${yieldPct.toFixed(1)} %`} />
        <KpiCard label={t("v2.production.kpi.loss")} value={`${lossPct.toFixed(1)} %`} />
      </div>

      <section className="mb-6">
        <h2 className="mb-2 font-medium">{t("v2.production.form.inputs")}</h2>
        <div className="space-y-2">
          {inputs.map((i) => (
            <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm">
              <span className="font-mono text-xs">{i.raw_batch?.batch_reference ?? "—"}</span>
              <span className="text-muted-foreground">{(fr ? i.crop?.name_fr : i.crop?.name_en) ?? "—"}</span>
              <span className="font-medium">{Number(i.quantity_tonnes).toFixed(3)} t</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 font-medium">{t("v2.production.form.outputs")}</h2>
        <div className="space-y-2">
          {outputs.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm">
              <span>{t(`v2.production.outputType.${o.output_type}`, { defaultValue: o.output_type })}</span>
              <span className="text-muted-foreground">
                {o.label ?? (o.loss_category ? t(`v2.production.loss.${o.loss_category}`, { defaultValue: o.loss_category }) : "—")}
              </span>
              <span className="font-medium">
                {Number(o.quantity).toFixed(2)} {o.unit_code}
              </span>
            </div>
          ))}
        </div>
      </section>

      {finished.length > 0 && (
        <section>
          <h2 className="mb-2 font-medium">{t("v2.production.finishedBatches")}</h2>
          <div className="space-y-2">
            {finished.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => navigate(`/app/operations/finished-goods/${f.id}`)}
                className="flex w-full flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-4 py-2 text-left text-sm transition-colors hover:border-primary/40"
              >
                <span className="font-mono text-xs">{f.batch_reference}</span>
                <span className="font-medium">
                  {Number(f.quantity_produced).toFixed(2)} {f.unit_code}
                </span>
                <span className="text-xs text-muted-foreground">{t("v2.production.viewTrace")}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("v2.production.voidTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("v2.production.voidDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <Input placeholder={t("v2.production.voidReason")} value={reason} onChange={(e) => setReason(e.target.value)} />
          <AlertDialogFooter>
            <AlertDialogCancel>{t("v2.common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={doVoid} disabled={voiding}>
              {voiding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("v2.production.voidCta")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default V2ProductionDetail;
