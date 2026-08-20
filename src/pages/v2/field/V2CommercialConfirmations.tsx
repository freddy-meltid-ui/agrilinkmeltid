// AGRI-GRID V2 — Phase 1E: commercial confirmation queue.
// Used by the supplier (self-service) and by the field agent acting on their behalf.
// Mobile-first: one card per request, three taps to answer.
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarRange, CheckCircle2, Handshake, Loader2, Phone, XCircle } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  answerCommitment,
  fetchConfirmationFeed,
  parseProcurementError,
  type ConfirmationFeedRow,
} from "@/lib/v2/procurement";
import { localeTag } from "@/lib/v2/locale";

const V2CommercialConfirmations = () => {
  const { t, i18n } = useTranslation();
  const fr = i18n.language.startsWith("fr");
  const [rows, setRows] = useState<ConfirmationFeedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ quantity: "", start: "", end: "", price: "", notes: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchConfirmationFeed());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openForm = (row: ConfirmationFeedRow) => {
    setOpenId(row.commitment_id);
    setForm({
      quantity: Number(row.proposed_quantity ?? 0).toString(),
      start: row.requested_start ?? "",
      end: row.requested_end ?? "",
      price: row.target_price != null ? String(row.target_price) : "",
      notes: "",
    });
  };

  const answer = async (row: ConfirmationFeedRow, accepted: boolean) => {
    setBusy(true);
    try {
      await answerCommitment({
        commitmentId: row.commitment_id,
        accepted,
        quantity: accepted ? Number(form.quantity) : null,
        unitCode: row.unit_code,
        start: accepted ? form.start || null : null,
        end: accepted ? form.end || null : null,
        unitPrice: accepted && form.price ? Number(form.price) : null,
        notes: form.notes || null,
      });
      toast({ title: accepted ? t("v2.procurement.confirm.done") : t("v2.procurement.confirm.declined") });
      setOpenId(null);
      await load();
    } catch (e) {
      const parsed = parseProcurementError(e instanceof Error ? e.message : String(e));
      toast({
        title: t(`v2.procurement.error.${parsed.code}`, { value: parsed.value ?? "", defaultValue: parsed.raw }),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  return (
    <>
      <PageHeader title={t("v2.procurement.confirm.title")} description={t("v2.procurement.confirm.description")} />

      {rows.length === 0 ? (
        <EmptyState icon={Handshake} title={t("v2.procurement.confirm.emptyTitle")} description={t("v2.procurement.confirm.emptyDescription")} />
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const crop = fr ? row.crop_name_fr : row.crop_name_en;
            const variety = fr ? row.variety_name_fr : row.variety_name_en;
            const open = openId === row.commitment_id;
            return (
              <article key={row.commitment_id} className="rounded-lg border border-border bg-card p-4">
                <p className="font-medium">
                  {crop}
                  {variety ? ` — ${variety}` : ""} · {Number(row.proposed_tonnes ?? 0).toFixed(2)} t
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {t("v2.procurement.confirm.askedBy", { processor: row.processor_name })}
                </p>
                <p className="mt-2 text-sm">
                  {row.supplier_name} · {row.supplier_code}
                  {row.commune ? ` · ${row.commune}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CalendarRange className="h-4 w-4" />
                    {row.requested_start ? new Date(row.requested_start).toLocaleDateString(localeTag(i18n.language)) : "—"} →{" "}
                    {row.requested_end ? new Date(row.requested_end).toLocaleDateString(localeTag(i18n.language)) : "—"}
                  </span>
                  {row.phone && (
                    <a className="flex items-center gap-1.5 underline" href={`tel:${row.phone}`}>
                      <Phone className="h-4 w-4" />
                      {row.phone}
                    </a>
                  )}
                </div>
                {row.expires_at && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("v2.procurement.confirm.expires", { date: new Date(row.expires_at).toLocaleDateString(localeTag(i18n.language)) })}
                  </p>
                )}

                {!open ? (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => openForm(row)}>
                      <CheckCircle2 className="mr-1.5 h-4 w-4" />
                      {t("v2.procurement.confirm.answer")}
                    </Button>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3 border-t border-border pt-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor={`q-${row.commitment_id}`}>{t("v2.procurement.confirm.quantity", { unit: row.unit_code })}</Label>
                        <Input id={`q-${row.commitment_id}`} type="number" step="0.01" className="mt-1" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
                      </div>
                      <div>
                        <Label htmlFor={`p-${row.commitment_id}`}>{t("v2.procurement.confirm.price")}</Label>
                        <Input id={`p-${row.commitment_id}`} type="number" className="mt-1" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
                      </div>
                      <div>
                        <Label htmlFor={`s-${row.commitment_id}`}>{t("v2.procurement.confirm.from")}</Label>
                        <Input id={`s-${row.commitment_id}`} type="date" className="mt-1" value={form.start} onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))} />
                      </div>
                      <div>
                        <Label htmlFor={`e-${row.commitment_id}`}>{t("v2.procurement.confirm.to")}</Label>
                        <Input id={`e-${row.commitment_id}`} type="date" className="mt-1" value={form.end} onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor={`n-${row.commitment_id}`}>{t("v2.procurement.confirm.notes")}</Label>
                      <Textarea id={`n-${row.commitment_id}`} rows={2} className="mt-1" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                    </div>
                    <p className="text-xs text-muted-foreground">{t("v2.procurement.confirm.partialHint")}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" disabled={busy || !form.quantity} onClick={() => answer(row, true)}>
                        {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
                        {t("v2.procurement.confirm.accept")}
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => answer(row, false)}>
                        <XCircle className="mr-1.5 h-4 w-4" />
                        {t("v2.procurement.confirm.decline")}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setOpenId(null)}>
                        {t("common.cancel", { defaultValue: "Cancel" })}
                      </Button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
};

export default V2CommercialConfirmations;
