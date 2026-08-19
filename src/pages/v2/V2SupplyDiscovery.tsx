// AGRI-GRID V2 — Phase 1C: supply discovery (list + map), processor-safe intelligence only.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Building2, Layers, Loader2, MapPin, Scale, Sprout, Users } from "lucide-react";
import PageHeader from "@/components/v2/ui-kit/PageHeader";
import KpiCard from "@/components/v2/ui-kit/KpiCard";
import EmptyState from "@/components/v2/ui-kit/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import SupplyFiltersPanel from "@/components/v2/supply/SupplyFilters";
import SupplyCard from "@/components/v2/supply/SupplyCard";
import SupplyMap from "@/components/v2/supply/SupplyMap";
import PipelineSummary from "@/components/v2/supply/PipelineSummary";
import CoveragePanel from "@/components/v2/supply/CoveragePanel";
import { useProcessor } from "@/hooks/v2/useProcessor";
import { fetchReferenceData, EMPTY_REFERENCE, ReferenceData } from "@/lib/v2/reference";
import {
  fetchCommercialSupply,
  fetchSupplyCoverage,
  fetchSupplyPipeline,
  summarise,
  type CommercialSupplyRow,
  type CoverageRow,
  type PipelineRow,
  type SupplyFilters,
} from "@/lib/v2/commercialSupply";

const PAGE_SIZE = 50;
const DEFAULT_FILTERS: SupplyFilters = { limit: PAGE_SIZE, offset: 0 };

const V2SupplyDiscovery = () => {
  const { t } = useTranslation();
  const { bundle, activeOrg, loading: processorLoading } = useProcessor();

  const [reference, setReference] = useState<ReferenceData>(EMPTY_REFERENCE);
  const [filters, setFilters] = useState<SupplyFilters>(DEFAULT_FILTERS);
  const [rows, setRows] = useState<CommercialSupplyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pipeline, setPipeline] = useState<PipelineRow[]>([]);
  const [coverage, setCoverage] = useState<CoverageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReferenceData().then(setReference);
  }, []);

  // Default the distance reference to the main facility once the profile is loaded.
  useEffect(() => {
    if (filters.facilityId || !bundle.facilities.length) return;
    const main = bundle.facilities.find((f) => f.is_main) ?? bundle.facilities[0];
    setFilters((f) => ({ ...f, facilityId: main.id }));
  }, [bundle.facilities, filters.facilityId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [feed, pipe] = await Promise.all([
        fetchCommercialSupply(filters),
        fetchSupplyPipeline({ facilityId: filters.facilityId, cropId: filters.cropId, varietyId: filters.varietyId, maxDistanceKm: filters.maxDistanceKm }),
      ]);
      setRows(feed.rows);
      setTotal(feed.total);
      setPipeline(pipe);
      if (activeOrg) setCoverage(await fetchSupplyCoverage(activeOrg.id, filters.facilityId));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [filters, activeOrg]);

  useEffect(() => {
    if (processorLoading) return;
    const id = window.setTimeout(load, 250);
    return () => window.clearTimeout(id);
  }, [load, processorLoading]);

  const stats = useMemo(() => summarise(rows), [rows]);
  const departments = useMemo(
    () => Array.from(new Set(rows.map((r) => r.department).filter(Boolean) as string[])).sort(),
    [rows],
  );
  const facility = useMemo(
    () => bundle.facilities.find((f) => f.id === filters.facilityId) ?? null,
    [bundle.facilities, filters.facilityId],
  );

  const patch = (p: Partial<SupplyFilters>) => setFilters((f) => ({ ...f, ...p, offset: 0 }));

  return (
    <>
      <PageHeader title={t("v2.supplyIntel.title")} description={t("v2.supplyIntel.description")} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={t("v2.supplyIntel.kpi.volume")} value={`${stats.tonnes} t`} hint={t("v2.supplyIntel.kpi.volumeHint")} icon={Scale} />
        <KpiCard label={t("v2.supplyIntel.kpi.confirmed")} value={`${stats.confirmedTonnes} t`} hint={t("v2.supplyIntel.kpi.confirmedHint")} icon={Sprout} />
        <KpiCard label={t("v2.supplyIntel.kpi.suppliers")} value={stats.suppliers} hint={t("v2.supplyIntel.kpi.suppliersHint")} icon={Users} />
        <KpiCard
          label={t("v2.supplyIntel.kpi.nearest")}
          value={stats.nearestKm == null ? "—" : `${stats.nearestKm.toFixed(0)} km`}
          hint={facility ? facility.name : t("v2.supplyIntel.kpi.nearestHint")}
          icon={MapPin}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-6">
          <SupplyFiltersPanel
            value={filters}
            onChange={patch}
            onReset={() => setFilters({ ...DEFAULT_FILTERS, facilityId: filters.facilityId })}
            reference={reference}
            facilities={bundle.facilities}
            departments={departments}
          />
          <CoveragePanel rows={coverage} />
        </div>

        <div className="space-y-6">
          <PipelineSummary rows={pipeline} />

          <Tabs defaultValue="list">
            <div className="flex items-center justify-between gap-3">
              <TabsList>
                <TabsTrigger value="list">
                  <Layers className="mr-1.5 h-4 w-4" />
                  {t("v2.supplyIntel.tabs.list")}
                </TabsTrigger>
                <TabsTrigger value="map">
                  <MapPin className="mr-1.5 h-4 w-4" />
                  {t("v2.supplyIntel.tabs.map")}
                </TabsTrigger>
              </TabsList>
              <p className="text-xs text-muted-foreground">
                {t("v2.supplyIntel.resultCount", { shown: rows.length, total })}
              </p>
            </div>

            {loading ? (
              <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("v2.supplyIntel.loading")}
              </div>
            ) : error ? (
              <EmptyState icon={Building2} title={t("v2.supplyIntel.errorTitle")} description={error} />
            ) : rows.length === 0 ? (
              <EmptyState icon={Sprout} title={t("v2.supplyIntel.emptyTitle")} description={t("v2.supplyIntel.emptyDescription")} />
            ) : (
              <>
                <TabsContent value="list" className="mt-4 space-y-3">
                  {rows.map((r) => (
                    <SupplyCard key={r.supply_id} row={r} />
                  ))}
                  {rows.length < total && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setFilters((f) => ({ ...f, limit: (f.limit ?? PAGE_SIZE) + PAGE_SIZE }))}
                    >
                      {t("v2.supplyIntel.loadMore")}
                    </Button>
                  )}
                </TabsContent>
                <TabsContent value="map" className="mt-4">
                  <SupplyMap rows={rows} facility={facility} />
                </TabsContent>
              </>
            )}
          </Tabs>

          <p className="text-xs text-muted-foreground">{t("v2.supplyIntel.privacyNote")}</p>
        </div>
      </div>
    </>
  );
};

export default V2SupplyDiscovery;
