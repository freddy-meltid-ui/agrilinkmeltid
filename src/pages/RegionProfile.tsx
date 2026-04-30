import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  getRegion, getCropRecommendations, getYieldEstimate, listCountries, listCrops,
  type Region, type Country, type CropProfile, type RegionRecommendationsPayload, type YieldEstimate,
} from "@/lib/atlas";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import RegionProfileCard from "@/components/atlas/RegionProfileCard";
import CropSuitabilityTable from "@/components/atlas/CropSuitabilityTable";
import YieldEstimateCard from "@/components/atlas/YieldEstimateCard";
import RecommendationCard from "@/components/atlas/RecommendationCard";
import DisclaimerBanner from "@/components/atlas/DisclaimerBanner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const RegionProfile = () => {
  const { regionId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [region, setRegion] = useState<Region | null>(null);
  const [country, setCountry] = useState<Country | null>(null);
  const [payload, setPayload] = useState<RegionRecommendationsPayload | null>(null);
  const [crops, setCrops] = useState<CropProfile[]>([]);
  const [cropId, setCropId] = useState<string>(searchParams.get("crop") ?? "all");
  const [yieldEstimate, setYieldEstimate] = useState<YieldEstimate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [r, p, allCrops, countries] = await Promise.all([
          getRegion(regionId), getCropRecommendations(regionId), listCrops(), listCountries(),
        ]);
        setRegion(r); setPayload(p); setCrops(allCrops);
        if (r) setCountry(countries.find((c) => c.id === r.country_id) ?? null);
      } finally { setLoading(false); }
    })();
  }, [regionId]);

  useEffect(() => {
    if (cropId === "all" || !regionId) { setYieldEstimate(null); return; }
    getYieldEstimate(regionId, cropId).then(setYieldEstimate).catch(() => setYieldEstimate(null));
  }, [cropId, regionId]);

  const onCropChange = (v: string) => {
    setCropId(v);
    if (v === "all") setSearchParams({}); else setSearchParams({ crop: v });
  };

  const chartData = useMemo(
    () => (payload?.recommended_crops ?? []).map((c) => ({
      name: c.crop_name,
      Min: c.yield_min_t_ha ?? 0,
      Max: c.yield_max_t_ha ?? 0,
    })),
    [payload],
  );

  const selectedCropEntry = payload?.recommended_crops.find((c) => c.crop_id === cropId);
  // restrict crop selector to crops actually recommended for this region
  const availableCrops = useMemo(() => {
    if (!payload) return [] as CropProfile[];
    const ids = new Set(payload.recommended_crops.map((c) => c.crop_id));
    return crops.filter((c) => ids.has(c.id));
  }, [crops, payload]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-stone-500">Chargement...</div>;
  if (!region || !payload) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <p className="text-stone-600">Région introuvable.</p>
      <Link to="/atlas" className="text-emerald-700 hover:underline">Retour à l'Atlas</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      <header className="border-b border-stone-200 bg-white">
        <div className="container mx-auto max-w-6xl px-4 py-5">
          <Link to="/atlas" className="text-sm text-stone-500 hover:text-emerald-700 inline-flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Atlas Agricole
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8 space-y-8">
        <RegionProfileCard region={region} countryName={country?.name_fr} />

        <Card>
          <CardContent className="pt-6 grid gap-4 sm:grid-cols-[1fr_auto] items-end">
            <div className="space-y-1.5 max-w-xs">
              <Label className="text-xs text-stone-600">Sélectionner une culture</Label>
              <Select value={cropId} onValueChange={onCropChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les cultures recommandées</SelectItem>
                  {availableCrops.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name_fr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-stone-500">
              {payload.recommended_crops.length} culture(s) recommandée(s) · {payload.rainfall_mm}
            </p>
          </CardContent>
        </Card>

        {selectedCropEntry && (
          <YieldEstimateCard
            crop={selectedCropEntry}
            confidence={yieldEstimate?.confidence ?? null}
            assumptions={yieldEstimate?.assumptions ?? []}
          />
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-emerald-950">Tableau d'aptitude des cultures</h2>
          <CropSuitabilityTable
            crops={selectedCropEntry ? [selectedCropEntry] : payload.recommended_crops}
          />
        </section>

        {chartData.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-medium text-stone-700 mb-4">
                Comparaison des fourchettes de rendement (t/ha)
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer>
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: -12, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#57534e" }} interval={0} angle={-15} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 11, fill: "#57534e" }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Min" fill="#a7f3d0" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Max" fill="#059669" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-emerald-950">Recommandations détaillées</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {payload.recommended_crops.map((c) => (
              <RecommendationCard key={c.crop_id} crop={c} regionId={region.id} />
            ))}
          </div>
        </section>

        <DisclaimerBanner />
      </main>
    </div>
  );
};

export default RegionProfile;
