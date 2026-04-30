import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Layers } from "lucide-react";
import InteractiveAgriculturalMap from "@/components/atlas/InteractiveAgriculturalMap";
import RegionDetailsPanel from "@/components/atlas/RegionDetailsPanel";
import RegionFilterBar, { defaultFilters, type AtlasFilters } from "@/components/atlas/RegionFilterBar";
import DisclaimerBanner from "@/components/atlas/DisclaimerBanner";
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
  const crops = useMemo(allCropNames, []);

  const filtered = useMemo(() => {
    return beninRegions.filter((r) => {
      if (filters.potential !== "all" && r.potential_level !== filters.potential) return false;
      if (filters.fertility !== "all" && r.fertility_level !== filters.fertility) return false;
      if (!matchesRainfall(r.rainfall_avg, filters.rainfall)) return false;
      if (filters.crop !== "all" && !r.recommended_crops.some((c) => c.crop_name === filters.crop)) return false;
      return true;
    });
  }, [filters]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      <header className="border-b border-stone-200 bg-white">
        <div className="container mx-auto max-w-7xl px-4 py-5">
          <Link to="/" className="text-sm text-stone-500 hover:text-emerald-700 inline-flex items-center gap-1 mb-2">
            <ArrowLeft className="h-3.5 w-3.5" /> Accueil
          </Link>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-emerald-100 p-2.5">
                <Layers className="h-6 w-6 text-emerald-700" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-emerald-950">Atlas Agricole</h1>
                <p className="text-stone-600 mt-1 text-sm">
                  Carte d'aide à la décision agricole — Bénin. Cliquez sur une région pour voir
                  ses sols, cultures recommandées et rendements indicatifs.
                </p>
              </div>
            </div>
            <Link
              to="/atlas/explorer"
              className="text-xs font-medium text-emerald-700 hover:text-emerald-900 underline"
            >
              Vue explorateur multi-pays →
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-7xl px-4 py-6 space-y-4">
        <DisclaimerBanner />

        <div className="grid gap-4 lg:grid-cols-12">
          <aside className="lg:col-span-4 space-y-4 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto lg:pr-2">
            <RegionFilterBar crops={crops} filters={filters} onChange={setFilters} />
            <RegionDetailsPanel region={selected} />
          </aside>

          <section className="lg:col-span-8">
            <div className="h-[50vh] lg:h-[calc(100vh-12rem)] lg:sticky lg:top-4">
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
    </div>
  );
};

export default AgriculturalAtlasPage;
