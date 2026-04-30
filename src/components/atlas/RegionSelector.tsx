import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { Country, Region, CropProfile } from "@/lib/atlas";

type Props = {
  countries: Country[];
  regions: Region[];
  crops: CropProfile[];
  countryId: string;
  regionId: string;
  cropId: string;
  onCountry: (v: string) => void;
  onRegion: (v: string) => void;
  onCrop: (v: string) => void;
};

const RegionSelector = ({
  countries,
  regions,
  crops,
  countryId,
  regionId,
  cropId,
  onCountry,
  onRegion,
  onCrop,
}: Props) => {
  const filteredRegions = countryId === "all" ? regions : regions.filter((r) => r.country_id === countryId);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="space-y-1.5">
        <Label className="text-xs text-stone-600">Pays</Label>
        <Select value={countryId} onValueChange={onCountry}>
          <SelectTrigger><SelectValue placeholder="Tous les pays" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les pays</SelectItem>
            {countries.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name_fr}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-stone-600">Région</Label>
        <Select value={regionId} onValueChange={onRegion}>
          <SelectTrigger><SelectValue placeholder="Toutes les régions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les régions</SelectItem>
            {filteredRegions.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-stone-600">Culture</Label>
        <Select value={cropId} onValueChange={onCrop}>
          <SelectTrigger><SelectValue placeholder="Toutes les cultures" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les cultures</SelectItem>
            {crops.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name_fr}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default RegionSelector;
