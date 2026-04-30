import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import type { Region, Country } from "@/lib/atlas";

type Props = {
  regions: Region[];
  countries: Country[];
  activeRegionId?: string;
};

const MapPlaceholder = ({ regions, countries, activeRegionId }: Props) => {
  const countryName = (id: string) => countries.find((c) => c.id === id)?.name_fr ?? "";

  return (
    <Card className="overflow-hidden border-emerald-100">
      <div className="relative bg-gradient-to-br from-emerald-50 via-stone-50 to-emerald-100/50 p-5 border-b border-emerald-100">
        <div className="flex items-center gap-2 text-sm text-emerald-900">
          <MapPin className="h-4 w-4" />
          <span className="font-medium">Carte d'aide à la décision agricole</span>
          <span className="text-stone-500 text-xs ml-auto">Vue placeholder — couches GeoJSON à venir</span>
        </div>
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
        {regions.map((r) => (
          <Link
            key={r.id}
            to={`/atlas/region/${r.id}`}
            className={
              "group rounded-lg border p-4 transition-all hover:shadow-md hover:border-emerald-400 " +
              (activeRegionId === r.id
                ? "border-emerald-500 bg-emerald-50/70 shadow-sm"
                : "border-stone-200 bg-white")
            }
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-stone-900 group-hover:text-emerald-800">{r.name}</p>
                <p className="text-xs text-stone-500 mt-0.5">{countryName(r.country_id)}</p>
              </div>
              <MapPin className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            </div>
            {r.agroecological_zone && (
              <p className="text-xs text-stone-600 mt-2">{r.agroecological_zone}</p>
            )}
            {r.rainfall_min_mm != null && r.rainfall_max_mm != null && (
              <p className="text-xs text-stone-500 mt-1">
                {r.rainfall_min_mm}–{r.rainfall_max_mm} mm/an · {r.dominant_soil_type}
              </p>
            )}
          </Link>
        ))}
        {regions.length === 0 && (
          <p className="text-sm text-stone-500 col-span-full text-center py-8">Aucune région à afficher.</p>
        )}
      </div>
    </Card>
  );
};

export default MapPlaceholder;
