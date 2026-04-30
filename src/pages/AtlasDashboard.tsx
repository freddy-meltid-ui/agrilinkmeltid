import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Layers, Sprout, Droplets, ArrowLeft } from "lucide-react";
import {
  listCountries, listRegions, listCrops,
  type Country, type Region, type CropProfile,
} from "@/lib/atlas";
import RegionSelector from "@/components/atlas/RegionSelector";
import MapPlaceholder from "@/components/atlas/MapPlaceholder";
import DisclaimerBanner from "@/components/atlas/DisclaimerBanner";
import FutureRoadmap from "@/components/atlas/FutureRoadmap";
import RegionProfileCard from "@/components/atlas/RegionProfileCard";

const AtlasDashboard = () => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [crops, setCrops] = useState<CropProfile[]>([]);
  const [countryId, setCountryId] = useState("all");
  const [regionId, setRegionId] = useState("all");
  const [cropId, setCropId] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [c, r, cr] = await Promise.all([listCountries(), listRegions(), listCrops()]);
        setCountries(c); setRegions(r); setCrops(cr);
      } finally { setLoading(false); }
    })();
  }, []);

  const filteredRegions = useMemo(() => {
    let list = regions;
    if (countryId !== "all") list = list.filter((r) => r.country_id === countryId);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) => r.name.toLowerCase().includes(q) || (r.agroecological_zone ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [regions, countryId, search]);

  const selectedRegion = regionId !== "all" ? regions.find((r) => r.id === regionId) : null;
  const avgRainfall = useMemo(() => {
    const list = filteredRegions.filter((r) => r.rainfall_min_mm != null && r.rainfall_max_mm != null);
    if (!list.length) return "—";
    const avg = list.reduce((s, r) => s + (r.rainfall_min_mm! + r.rainfall_max_mm!) / 2, 0) / list.length;
    return `${Math.round(avg)} mm/an`;
  }, [filteredRegions]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      <header className="border-b border-stone-200 bg-white">
        <div className="container mx-auto max-w-6xl px-4 py-6">
          <Link to="/" className="text-sm text-stone-500 hover:text-emerald-700 inline-flex items-center gap-1 mb-3">
            <ArrowLeft className="h-3.5 w-3.5" /> Accueil
          </Link>
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-emerald-100 p-2.5"><Layers className="h-6 w-6 text-emerald-700" /></div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-emerald-950">Atlas Agricole Intelligent</h1>
              <p className="text-stone-600 mt-1 text-sm sm:text-base">
                Carte d'aide à la décision agricole — explorez les régions, sols, climats et cultures
                recommandées à travers le réseau AgriGrid.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8 space-y-8">
        <DisclaimerBanner />

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une région ou une zone agroécologique..."
                className="pl-9"
              />
            </div>
            <RegionSelector
              countries={countries} regions={regions} crops={crops}
              countryId={countryId} regionId={regionId} cropId={cropId}
              onCountry={(v) => { setCountryId(v); setRegionId("all"); }}
              onRegion={setRegionId} onCrop={setCropId}
            />
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          <KPI icon={Layers} label="Régions référencées" value={filteredRegions.length} />
          <KPI icon={Sprout} label="Cultures couvertes" value={crops.length} />
          <KPI icon={Droplets} label="Pluviométrie moyenne" value={avgRainfall} />
        </div>

        {selectedRegion && (
          <RegionProfileCard
            region={selectedRegion}
            countryName={countries.find((c) => c.id === selectedRegion.country_id)?.name_fr}
          />
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-emerald-950">Régions</h2>
          <MapPlaceholder regions={filteredRegions} countries={countries} activeRegionId={selectedRegion?.id} />
          {selectedRegion && (
            <Link
              to={`/atlas/region/${selectedRegion.id}${cropId !== "all" ? `?crop=${cropId}` : ""}`}
              className="inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-900"
            >
              Voir le profil complet de {selectedRegion.name} →
            </Link>
          )}
        </section>

        <FutureRoadmap />

        {loading && <p className="text-center text-sm text-stone-500">Chargement...</p>}
      </main>
    </div>
  );
};

const KPI = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) => (
  <Card className="border-emerald-100">
    <CardContent className="pt-6 flex items-center gap-3">
      <div className="rounded-md bg-emerald-50 p-2.5"><Icon className="h-5 w-5 text-emerald-700" /></div>
      <div>
        <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
        <p className="text-xl font-semibold text-stone-900">{value}</p>
      </div>
    </CardContent>
  </Card>
);

export default AtlasDashboard;
