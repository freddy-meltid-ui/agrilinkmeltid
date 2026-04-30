import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Droplets, Mountain, Wheat, Sprout, AlertCircle } from "lucide-react";
import type { Region } from "@/lib/atlas";

const fertilityLabel = { low: "Faible", medium: "Moyenne", high: "Élevée" } as const;
const irrigLabel = { low: "Faible", medium: "Moyen", high: "Élevé" } as const;

const RegionProfileCard = ({ region, countryName }: { region: Region; countryName?: string }) => (
  <Card className="border-emerald-100">
    <CardHeader>
      <div className="flex items-start justify-between gap-3">
        <div>
          <CardTitle className="text-2xl text-emerald-900">{region.name}</CardTitle>
          <p className="text-sm text-stone-500 mt-1">{countryName}</p>
        </div>
        {region.agroecological_zone && (
          <Badge variant="outline" className="border-emerald-300 text-emerald-800 bg-emerald-50">
            {region.agroecological_zone}
          </Badge>
        )}
      </div>
    </CardHeader>
    <CardContent className="grid gap-4 sm:grid-cols-2">
      <Item icon={Droplets} label="Pluviométrie">
        {region.rainfall_min_mm != null && region.rainfall_max_mm != null
          ? `${region.rainfall_min_mm}–${region.rainfall_max_mm} mm/an`
          : "n/d"}
      </Item>
      <Item icon={Mountain} label="Sol dominant">{region.dominant_soil_type ?? "n/d"}</Item>
      <Item icon={Wheat} label="Fertilité du sol">
        {region.soil_fertility_level ? fertilityLabel[region.soil_fertility_level] : "n/d"}
      </Item>
      <Item icon={Sprout} label="Potentiel d'irrigation">
        {region.irrigation_potential ? irrigLabel[region.irrigation_potential] : "n/d"}
      </Item>
      <div className="sm:col-span-2 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-stone-700">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          Contraintes principales
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(region.main_constraints ?? []).length === 0 ? (
            <span className="text-sm text-stone-500">Aucune contrainte majeure renseignée</span>
          ) : (
            region.main_constraints!.map((c) => (
              <Badge key={c} variant="secondary" className="bg-stone-100 text-stone-700">{c}</Badge>
            ))
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

const Item = ({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-3">
    <div className="rounded-md bg-emerald-50 p-2"><Icon className="h-4 w-4 text-emerald-700" /></div>
    <div>
      <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
      <p className="text-sm font-medium text-stone-900">{children}</p>
    </div>
  </div>
);

export default RegionProfileCard;
