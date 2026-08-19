// AGRI-GRID V2 — Phase 1C: processor-safe supply detail. No identity, no phone, no exact GPS.
// Sourcing actions are intentionally disabled (Phase 1D).
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, History, Loader2, Lock, MapPin, Scale, Sprout } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import { Button } from "@/components/ui/button";
import { ConfidenceBadge, FreshnessBadge, SupplyStatusBadge } from "@/components/v2/supply/SupplyBadges";
import SupplyMap from "@/components/v2/supply/SupplyMap";
import {
  fetchCommercialSupply,
  fetchSupplyHistory,
  type CommercialSupplyRow,
  type SupplyHistoryRow,
} from "@/lib/v2/commercialSupply";

const V2SupplyDetail = () => {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const fr = i18n.language.startsWith("fr");
  const [row, setRow] = useState<CommercialSupplyRow | null>(null);
  const [history, setHistory] = useState<SupplyHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      setLoading(true);
      const [feed, hist] = await Promise.all([
        fetchCommercialSupply({ limit: 500 }).catch(() => ({ rows: [] as CommercialSupplyRow[], total: 0 })),
        fetchSupplyHistory(id).catch(() => [] as SupplyHistoryRow[]),
      ]);
      if (!active) return;
      setRow(feed.rows.find((r) => r.supply_id === id) ?? null);
      setHistory(hist);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { day: "2-digit", month: "short", year: "numeric" }),
    [i18n.language],
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("v2.supplyIntel.loading")}
      </div>
    );
  }

  if (!row) {
    return (
      <EmptyState
        icon={Sprout}
        title={t("v2.supplyIntel.detail.notFoundTitle")}
        description={t("v2.supplyIntel.detail.notFoundDescription")}
        action={
          <Link to="/app/supply">
            <Button variant="outline">{t("v2.supplyIntel.detail.back")}</Button>
          </Link>
        }
      />
    );
  }

  const crop = fr ? row.crop_name_fr : row.crop_name_en;
  const variety = fr ? row.variety_name_fr : row.variety_name_en;

  return (
    <>
      <PageHeader
        title={`${crop}${variety ? ` — ${variety}` : ""}`}
        description={row.supplier_ref}
        actions={
          <Link to="/app/supply">
            <Button variant="outline">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              {t("v2.supplyIntel.detail.back")}
            </Button>
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-lg border border-border bg-card p-5">
          <div className="flex flex-wrap gap-2">
            <SupplyStatusBadge value={row.supply_status} />
            <ConfidenceBadge value={row.confidence} />
            <FreshnessBadge value={row.freshness} />
          </div>

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">{t("v2.supplyIntel.detail.quantity")}</dt>
              <dd className="flex items-center gap-1.5 font-medium">
                <Scale className="h-4 w-4 text-muted-foreground" />
                {Number(row.quantity_tonnes ?? 0).toFixed(2)} t
                <span className="text-xs text-muted-foreground">
                  ({Number(row.quantity ?? 0)} {row.unit_code})
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("v2.supplyIntel.detail.window")}</dt>
              <dd className="font-medium">
                {row.availability_start ? dateFmt.format(new Date(row.availability_start)) : "—"} →{" "}
                {row.availability_end ? dateFmt.format(new Date(row.availability_end)) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("v2.supplyIntel.detail.zone")}</dt>
              <dd className="flex items-center gap-1.5 font-medium">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {row.commune ?? "—"}
                {row.department ? `, ${row.department}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("v2.supplyIntel.detail.distance")}</dt>
              <dd className="font-medium">{row.distance_km == null ? "—" : `~${Number(row.distance_km).toFixed(0)} km`}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("v2.supplyIntel.detail.quality")}</dt>
              <dd className="font-medium">{row.quality_grade ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("v2.supplyIntel.detail.certification")}</dt>
              <dd className="font-medium">{row.certification_status ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("v2.supplyIntel.detail.lastConfirmed")}</dt>
              <dd className="font-medium">
                {row.last_confirmed_at ? dateFmt.format(new Date(row.last_confirmed_at)) : t("v2.supplyIntel.detail.never")}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("v2.supplyIntel.detail.verification")}</dt>
              <dd className="font-medium">
                {t(`v2.supply.verification.${row.verification_status}`, { defaultValue: row.verification_status ?? "—" })}
              </dd>
            </div>
          </dl>

          <div className="rounded-md border border-dashed border-border p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Lock className="h-4 w-4 text-muted-foreground" />
              {t("v2.supplyIntel.detail.sourcingTitle")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t("v2.supplyIntel.detail.sourcingDescription")}</p>
            <Button className="mt-3" disabled>
              {t("v2.supplyIntel.detail.sourcingCta")}
            </Button>
          </div>
        </section>

        <div className="space-y-6">
          <SupplyMap rows={[row]} />

          <section className="rounded-lg border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-medium">{t("v2.supplyIntel.detail.historyTitle")}</h2>
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("v2.supplyIntel.detail.historyEmpty")}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {history.map((h, i) => (
                  <li key={`${h.entry_date}-${i}`} className="flex items-center justify-between rounded-md border border-border p-3">
                    <div>
                      <p className="font-medium">{Number(h.quantity_tonnes ?? 0).toFixed(2)} t</p>
                      <p className="text-xs text-muted-foreground">
                        {t(`v2.supplyIntel.detail.entryType.${h.entry_type}`, { defaultValue: h.entry_type })} ·{" "}
                        {h.entry_date ? dateFmt.format(new Date(h.entry_date)) : "—"}
                      </p>
                    </div>
                    <ConfidenceBadge value={h.confidence} />
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-muted-foreground">{t("v2.supplyIntel.detail.historyNote")}</p>
          </section>
        </div>
      </div>
    </>
  );
};

export default V2SupplyDetail;
