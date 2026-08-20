// AGRI-GRID V2 — Phase 1D: explainable match card (processor-safe data only).
import { useTranslation } from "react-i18next";
import { AlertTriangle, CalendarRange, Check, Handshake, MapPin, RefreshCw, Scale, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfidenceBadge, FreshnessBadge, SupplyStatusBadge } from "@/components/v2/supply/SupplyBadges";
import type { MatchRow } from "@/lib/v2/sourcing";
import { localeTag } from "@/lib/v2/locale";

type Reason = { code: string; ok: boolean; value: unknown; confirmed_at?: string | null };

const fmtDate = (d: string | null, lang: string) =>
  d ? new Date(d).toLocaleDateString(localeTag(lang), { day: "2-digit", month: "short" }) : "—";

const MatchCard = ({
  row,
  allocated,
  onReconfirm,
  reconfirmBusy,
  taskPending,
  onCommit,
  commitPending,
}: {
  row: MatchRow;
  allocated?: number;
  onReconfirm?: (row: MatchRow) => void;
  reconfirmBusy?: boolean;
  taskPending?: boolean;
  /** Phase 1E — ask this supplier to commercially confirm a quantity. */
  onCommit?: (row: MatchRow) => void;
  commitPending?: boolean;
}) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const fr = lang.startsWith("fr");
  const crop = fr ? row.crop_name_fr : row.crop_name_en;
  const variety = fr ? row.variety_name_fr : row.variety_name_en;
  const reasons = (row.reasons as unknown as Reason[]) ?? [];
  const blocking = (row.blocking_reasons as string[]) ?? [];
  const near = row.match_class === "near_match";

  const reasonLabel = (r: Reason) => {
    switch (r.code) {
      case "variety":
        return t("v2.sourcing.reason.variety", { value: r.value ?? "—" });
      case "window":
        return r.ok
          ? t("v2.sourcing.reason.windowOk", { days: r.value })
          : t("v2.sourcing.reason.windowKo");
      case "distance":
        return r.value == null
          ? t("v2.sourcing.reason.distanceUnknown")
          : t("v2.sourcing.reason.distance", { km: Number(r.value).toFixed(0) });
      case "freshness":
        return t(`v2.sourcing.reason.freshness_${r.value}`, {
          defaultValue: String(r.value),
        });
      case "confidence":
        return t("v2.sourcing.reason.confidence", {
          value: t(`v2.supplyIntel.confidence.${r.value}`, { defaultValue: String(r.value) }),
        });
      case "quantity":
        return t("v2.sourcing.reason.quantity", { value: Number(r.value ?? 0).toFixed(2) });
      case "quality":
        return r.value ? t("v2.sourcing.reason.quality", { value: r.value }) : t("v2.sourcing.reason.qualityUnknown");
      case "certification":
        return r.value && !["none", "aucune", "unknown"].includes(String(r.value).toLowerCase())
          ? t("v2.sourcing.reason.certification", { value: r.value })
          : t("v2.sourcing.reason.certificationNone");
      default:
        return r.code;
    }
  };

  return (
    <article className={`rounded-lg border bg-card p-4 ${near ? "border-dashed border-border" : "border-border"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">
            {crop}
            {variety ? ` — ${variety}` : ""}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{row.supplier_ref}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-primary">{Number(row.score ?? 0).toFixed(0)}%</p>
          <p className="text-xs text-muted-foreground">{t("v2.sourcing.matchScore")}</p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <span className="flex items-center gap-1.5">
          <Scale className="h-4 w-4 text-muted-foreground" />
          {Number(row.quantity_tonnes ?? 0).toFixed(2)} t
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          {row.commune ?? row.department ?? "—"}
          {row.distance_km != null && ` · ~${Number(row.distance_km).toFixed(0)} km`}
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <CalendarRange className="h-4 w-4" />
          {fmtDate(row.availability_start, lang)} → {fmtDate(row.availability_end, lang)}
        </span>
      </div>

      <ul className="mt-3 space-y-1 text-sm">
        {reasons.map((r) => (
          <li key={r.code} className={`flex items-start gap-2 ${r.ok ? "text-foreground" : "text-muted-foreground"}`}>
            {r.ok ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent-foreground" />
            )}
            <span>{reasonLabel(r)}</span>
          </li>
        ))}
      </ul>

      {blocking.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-md bg-muted/60 p-3 text-sm">
          {blocking.map((b) => (
            <li key={b} className="flex items-start gap-2 text-muted-foreground">
              <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <span>{t(`v2.sourcing.blocking.${b}`, { defaultValue: b })}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SupplyStatusBadge value={row.supply_status} />
        <FreshnessBadge value={row.freshness} />
        <ConfidenceBadge value={row.confidence} />
        {allocated != null && (
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            {t("v2.sourcing.allocated", { tonnes: allocated.toFixed(2) })}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {onCommit && (
          <Button size="sm" disabled={commitPending || Number(row.quantity_tonnes ?? 0) <= 0} onClick={() => onCommit(row)}>
            <Handshake className="mr-1.5 h-4 w-4" />
            {commitPending ? t("v2.procurement.propose.pending") : t("v2.procurement.propose.cta")}
          </Button>
        )}
        {onReconfirm && (
          <Button variant="outline" size="sm" disabled={reconfirmBusy || taskPending} onClick={() => onReconfirm(row)}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            {taskPending ? t("v2.sourcing.reconfirmPending") : t("v2.sourcing.reconfirmCta")}
          </Button>
        )}
      </div>
    </article>
  );
};

export default MatchCard;
