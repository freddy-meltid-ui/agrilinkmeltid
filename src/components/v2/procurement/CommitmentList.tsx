// AGRI-GRID V2 — Phase 1E: commercial confirmations attached to a sourcing request.
// Shows the reservation state, the controlled contact disclosure and the transition
// to a procurement order.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarRange, FileText, Loader2, Phone, ShieldCheck, Undo2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/v2/ui-kit/StatusBadge";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import { COMMITMENT_TONE, ORDER_TONE, type RequestCommitmentRow } from "@/lib/v2/procurement";
import { localeTag } from "@/lib/v2/locale";

const CommitmentList = ({
  rows,
  busyId,
  onCreateOrder,
  onRelease,
}: {
  rows: RequestCommitmentRow[];
  busyId: string | null;
  onCreateOrder: (row: RequestCommitmentRow) => void;
  onRelease: (row: RequestCommitmentRow) => void;
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const fr = i18n.language.startsWith("fr");
  const [expanded, setExpanded] = useState<string | null>(null);

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString(localeTag(i18n.language), { day: "2-digit", month: "short" }) : "—";

  if (rows.length === 0) {
    return <EmptyState icon={ShieldCheck} title={t("v2.procurement.commitments.emptyTitle")} description={t("v2.procurement.commitments.emptyDescription")} />;
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const crop = fr ? row.crop_name_fr : row.crop_name_en;
        const variety = fr ? row.variety_name_fr : row.variety_name_en;
        const reserving = ["confirmed", "partially_confirmed", "fulfilled"].includes(row.status ?? "");
        const canOrder = ["confirmed", "partially_confirmed"].includes(row.status ?? "") && !row.order_id;

        return (
          <article key={row.commitment_id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {crop}
                  {variety ? ` — ${variety}` : ""}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{row.contact_name ?? row.supplier_ref}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  label={t(`v2.procurement.commitmentStatus.${row.status}`, { defaultValue: row.status ?? "" })}
                  tone={COMMITMENT_TONE[row.status ?? ""] ?? "neutral"}
                />
                {row.order_number && (
                  <StatusBadge
                    label={`${row.order_number} · ${t(`v2.procurement.orderStatus.${row.order_status}`, { defaultValue: row.order_status ?? "" })}`}
                    tone={ORDER_TONE[row.order_status ?? ""] ?? "neutral"}
                  />
                )}
              </div>
            </div>

            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">{t("v2.procurement.commitments.proposed")}</dt>
                <dd>{Number(row.proposed_tonnes ?? 0).toFixed(2)} t</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("v2.procurement.commitments.confirmed")}</dt>
                <dd className={reserving ? "font-medium text-primary" : ""}>{Number(row.confirmed_tonnes ?? 0).toFixed(2)} t</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("v2.procurement.commitments.window")}</dt>
                <dd className="flex items-center gap-1.5">
                  <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
                  {fmt(row.confirmed_start ?? row.requested_start)} → {fmt(row.confirmed_end ?? row.requested_end)}
                </dd>
              </div>
            </dl>

            {row.contact_released ? (
              <div className="mt-3 flex flex-wrap items-center gap-4 rounded-md bg-primary/5 p-3 text-sm">
                <span className="flex items-center gap-1.5">
                  <User className="h-4 w-4 text-primary" />
                  {row.contact_name ?? "—"}
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-primary" />
                  {row.contact_phone ?? "—"}
                </span>
                <span className="text-xs text-muted-foreground">{t("v2.procurement.commitments.contactReleased")}</span>
              </div>
            ) : (
              <p className="mt-3 rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
                {t("v2.procurement.commitments.contactHidden")}
              </p>
            )}

            {row.confirmation_method && (
              <p className="mt-2 text-xs text-muted-foreground">
                {t("v2.procurement.commitments.confirmedBy", {
                  method: t(`v2.procurement.method.${row.confirmation_method}`, { defaultValue: row.confirmation_method }),
                  date: row.confirmed_at ? new Date(row.confirmed_at).toLocaleString(localeTag(i18n.language)) : "—",
                })}
              </p>
            )}
            {!row.confirmation_method && row.expires_at && (
              <p className="mt-2 text-xs text-muted-foreground">
                {t("v2.procurement.commitments.expires", { date: new Date(row.expires_at).toLocaleDateString(localeTag(i18n.language)) })}
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {canOrder && (
                <Button size="sm" disabled={busyId === row.commitment_id} onClick={() => onCreateOrder(row)}>
                  {busyId === row.commitment_id ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileText className="mr-1.5 h-4 w-4" />}
                  {t("v2.procurement.commitments.createOrder")}
                </Button>
              )}
              {row.order_id && (
                <Button size="sm" variant="outline" onClick={() => navigate(`/app/operations/orders/${row.order_id}`)}>
                  <FileText className="mr-1.5 h-4 w-4" />
                  {t("v2.procurement.commitments.openOrder")}
                </Button>
              )}
              {reserving && !row.order_id && (
                <Button size="sm" variant="ghost" disabled={busyId === row.commitment_id} onClick={() => onRelease(row)}>
                  <Undo2 className="mr-1.5 h-4 w-4" />
                  {t("v2.procurement.commitments.release")}
                </Button>
              )}
              {row.task_status && (
                <span className="self-center text-xs text-muted-foreground">
                  {t("v2.procurement.commitments.task", {
                    status: t(`v2.field.taskStatus.${row.task_status}`, { defaultValue: row.task_status }),
                  })}
                </span>
              )}
            </div>

            {row.notes && (
              <button type="button" className="mt-2 text-xs text-muted-foreground underline" onClick={() => setExpanded(expanded === row.commitment_id ? null : row.commitment_id)}>
                {expanded === row.commitment_id ? row.notes : t("v2.procurement.commitments.showNotes")}
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
};

export default CommitmentList;
