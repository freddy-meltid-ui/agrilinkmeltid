// AGRI-GRID V2 — Phase 1C: processor-safe supply card (no identity, no phone, no exact GPS)
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarRange, MapPin, Scale } from "lucide-react";
import { ConfidenceBadge, FreshnessBadge, SupplyStatusBadge } from "./SupplyBadges";
import type { CommercialSupplyRow } from "@/lib/v2/commercialSupply";

const fmtDate = (d: string | null, lang: string) => (d ? new Date(d).toLocaleDateString(lang, { day: "2-digit", month: "short" }) : "—");

const SupplyCard = ({ row }: { row: CommercialSupplyRow }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const crop = lang.startsWith("fr") ? row.crop_name_fr : row.crop_name_en;
  const variety = lang.startsWith("fr") ? row.variety_name_fr : row.variety_name_en;

  return (
    <Link
      to={`/app/supply/${row.supply_id}`}
      className="block rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">
            {crop}
            {variety ? ` — ${variety}` : ""}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{row.supplier_ref}</p>
        </div>
        <ConfidenceBadge value={row.confidence} />
      </div>

      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <span className="flex items-center gap-1.5 text-foreground">
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

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SupplyStatusBadge value={row.supply_status} />
        <FreshnessBadge value={row.freshness} />
        {row.verification_status === "field_verified" && (
          <span className="text-xs text-primary">{t("v2.supplyIntel.fieldVerified")}</span>
        )}
      </div>
    </Link>
  );
};

export default SupplyCard;
