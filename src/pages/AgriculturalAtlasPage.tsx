import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Layers, List, Map as MapIcon, Download } from "lucide-react";
import OfflineStatusBanner from "@/components/atlas/OfflineStatusBanner";
import InteractiveAgriculturalMap from "@/components/atlas/InteractiveAgriculturalMap";
import RegionDetailsPanel from "@/components/atlas/RegionDetailsPanel";
import RegionFilterBar, { defaultFilters, type AtlasFilters } from "@/components/atlas/RegionFilterBar";
import RegionList from "@/components/atlas/RegionList";
import AtlasBottomBar from "@/components/atlas/AtlasBottomBar";
import DisclaimerBanner from "@/components/atlas/DisclaimerBanner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { beninRegions, allCropNames, type BeninRegion } from "@/lib/beninRegions";

const matchesRainfall = (avg: number, bucket: string) => {
  if (bucket === "all") return true;
  if (bucket === "lt900") return avg < 900;
  if (bucket === "900-1100") return avg >= 900 && avg < 1100;
  if (bucket === "1100-1300") return avg >= 1100 && avg < 1300;
  if (bucket === "gt1300") return avg >= 1300;
  return true;
};

const AgriculturalAtlasPage = () => {
  const [selected, setSelected] = useState<BeninRegion | null>(null);
  const [filters, setFilters] = useState<AtlasFilters>(defaultFilters);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const crops = useMemo(allCropNames, []);

  const filtered = useMemo(() => {
    return beninRegions.filter((r) => {
      if (filters.potential !== "all" && r.potential_level !== filters.potential) return false;
      if (filters.fertility !== "all" && r.fertility_level !== filters.fertility) return false;
      if (!matchesRainfall(r.rainfall_avg, filters.rainfall)) return false;
      if (filters.crop !== "all" && !r.recommended_crops.some((c) => c.crop_name === filters.crop))
        return false;
      return true;
    });
  }, [filters]);

  const handleSelectFromList = (r: BeninRegion) => {
    setSelected(r);
    // On mobile, scroll to the details below
    setTimeout(() => {
      document.getElementById("region-details")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white pb-24 lg:pb-0">
      <header className="border-b border-stone-200 bg-white">
        <div className="container mx-auto max-w-7xl px-4 py-4 lg:py-5">
          <Link
            to="/"
            className="text-sm text-stone-500 hover:text-emerald-700 inline-flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Accueil
          </Link>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-emerald-100 p-2.5">
                <Layers className="h-6 w-6 text-emerald-700" />
              </div>
              <div>
                <h1 className="text-xl sm:text-3xl font-semibold text-emerald-950">AgriGrid Atlas</h1>
                <p className="text-stone-600 mt-1 text-sm hidden sm:block">
                  Intelligence agricole et coordination des ressources pour l'Afrique.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <Link
                to="/atlas/offline"
                className="font-medium text-emerald-700 hover:text-emerald-900 underline inline-flex items-center gap-1"
              >
                <Download className="h-3.5 w-3.5" /> Hors-ligne
              </Link>
              <Link
                to="/atlas/explorer"
                className="font-medium text-emerald-700 hover:text-emerald-900 underline hidden sm:inline"
              >
                Vue explorateur multi-pays →
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-7xl px-4 py-4 lg:py-6 space-y-4">
        <OfflineStatusBanner />
        <DisclaimerBanner />

        {/* Mobile: list-first with tab toggle to map */}
        <div className="lg:hidden space-y-4">
          <RegionFilterBar crops={crops} filters={filters} onChange={setFilters} />

          <Tabs value={mobileView} onValueChange={(v) => setMobileView(v as "list" | "map")}>
            <TabsList className="grid grid-cols-2 w-full h-11">
              <TabsTrigger value="list" className="text-sm">
                <List className="h-4 w-4 mr-1.5" /> Régions ({filtered.length})
              </TabsTrigger>
              <TabsTrigger value="map" className="text-sm">
                <MapIcon className="h-4 w-4 mr-1.5" /> Carte
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="mt-3">
              <RegionList regions={filtered} selected={selected} onSelect={handleSelectFromList} />
            </TabsContent>

            <TabsContent value="map" className="mt-3">
              <div className="h-[55vh] min-h-[360px]">
                <InteractiveAgriculturalMap
                  regions={filtered}
                  selected={selected}
                  onSelect={(r) => {
                    setSelected(r);
                    setMobileView("list");
                  }}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div id="region-details">
            <RegionDetailsPanel region={selected} />
          </div>
        </div>

        {/* Desktop: original two-column layout */}
        <div className="hidden lg:grid gap-4 lg:grid-cols-12">
          <aside
            id="recommendations"
            className="lg:col-span-4 space-y-4 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto lg:pr-2 scroll-mt-20"
          >
            <RegionFilterBar crops={crops} filters={filters} onChange={setFilters} />
            <RegionList regions={filtered} selected={selected} onSelect={setSelected} />
            <RegionDetailsPanel region={selected} />
          </aside>

          <section className="lg:col-span-8">
            <div className="h-[calc(100vh-12rem)] lg:sticky lg:top-4">
              <InteractiveAgriculturalMap
                regions={filtered}
                selected={selected}
                onSelect={setSelected}
              />
              {filtered.length === 0 && (
                <p className="text-center text-sm text-stone-500 mt-3">
                  Aucune région ne correspond aux filtres sélectionnés.
                </p>
              )}
            </div>
          </section>
        </div>
      </main>

      <AtlasBottomBar region={selected} />
    </div>
  );
};

export default AgriculturalAtlasPage;
