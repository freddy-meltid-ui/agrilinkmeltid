// AGRI-GRID V2 — reuses the existing V1 Atlas module inside the V2 shell (V1 code untouched)
// and adds a Phase 1C supply-intelligence layer on top (approximate, privacy-preserving).
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import { Button } from "@/components/ui/button";
import SupplyMap from "@/components/v2/supply/SupplyMap";
import AgriculturalAtlasPage from "@/pages/AgriculturalAtlasPage";
import { fetchReferenceData, refLabel, type ReferenceData, EMPTY_REFERENCE } from "@/lib/v2/reference";
import { fetchCommercialSupply, summarise, type CommercialSupplyRow } from "@/lib/v2/commercialSupply";

const V2Atlas = () => {
  const { t, i18n } = useTranslation();
  const [reference, setReference] = useState<ReferenceData>(EMPTY_REFERENCE);
  const [cropId, setCropId] = useState<string | null>(null);
  const [rows, setRows] = useState<CommercialSupplyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReferenceData().then(setReference);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchCommercialSupply({ cropId, limit: 300 })
      .then((r) => active && setRows(r.rows))
      .catch(() => active && setRows([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [cropId]);

  const stats = useMemo(() => summarise(rows), [rows]);
  const cropsWithSupply = reference.crops.filter((c) => c.is_active);

  return (
    <>
      <PageHeader title={t("v2.atlas.title")} description={t("v2.atlas.description")} />

      <section className="mb-8 rounded-lg border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-medium">{t("v2.supplyIntel.title")}</h2>
            <p className="text-xs text-muted-foreground">
              {loading
                ? t("v2.supplyIntel.loading")
                : t("v2.supplyIntel.coverage.detail", {
                    pct: 100,
                    suppliers: stats.suppliers,
                    radius: 0,
                    confirmed: stats.confirmedTonnes,
                  }).split("·").slice(1).join("·").trim()}
            </p>
          </div>
          <Link to="/app/supply">
            <Button variant="outline" size="sm">{t("v2.supplyIntel.viewDetail")}</Button>
          </Link>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <Button size="sm" variant={cropId === null ? "default" : "outline"} onClick={() => setCropId(null)}>
            {t("v2.supplyIntel.filters.allCrops")}
          </Button>
          {cropsWithSupply.map((c) => (
            <Button key={c.id} size="sm" variant={cropId === c.id ? "default" : "outline"} onClick={() => setCropId(c.id)}>
              {refLabel(c, i18n.language)}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("v2.supplyIntel.loading")}
          </div>
        ) : (
          <>
            <SupplyMap rows={rows} />
            <p className="mt-3 text-xs text-muted-foreground">
              {stats.tonnes} t · {t("v2.supplyIntel.pipeline.suppliers", { count: stats.suppliers })}
            </p>
          </>
        )}
      </section>

      <AgriculturalAtlasPage />
    </>
  );
};

export default V2Atlas;
