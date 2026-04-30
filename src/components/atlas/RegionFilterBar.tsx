import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";

export type AtlasFilters = {
  crop: string;
  potential: string;
  rainfall: string;
  fertility: string;
};

export const defaultFilters: AtlasFilters = {
  crop: "all",
  potential: "all",
  rainfall: "all",
  fertility: "all",
};

type Props = {
  crops: string[];
  filters: AtlasFilters;
  onChange: (f: AtlasFilters) => void;
};

const RegionFilterBar = ({ crops, filters, onChange }: Props) => {
  const set = (k: keyof AtlasFilters) => (v: string) => onChange({ ...filters, [k]: v });
  const isDirty = JSON.stringify(filters) !== JSON.stringify(defaultFilters);

  return (
    <Card className="border-emerald-100">
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
            <Filter className="h-4 w-4" /> Filtres
          </div>
          {isDirty && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onChange(defaultFilters)}>
              <X className="h-3 w-3 mr-1" /> Réinitialiser
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Culture">
            <Select value={filters.crop} onValueChange={set("crop")}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {crops.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Potentiel">
            <Select value={filters.potential} onValueChange={set("potential")}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="élevée">Élevé</SelectItem>
                <SelectItem value="moyenne">Moyen</SelectItem>
                <SelectItem value="faible">Faible</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Pluviométrie">
            <Select value={filters.rainfall} onValueChange={set("rainfall")}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="lt900">{"< 900 mm"}</SelectItem>
                <SelectItem value="900-1100">900–1100 mm</SelectItem>
                <SelectItem value="1100-1300">1100–1300 mm</SelectItem>
                <SelectItem value="gt1300">{"> 1300 mm"}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Fertilité">
            <Select value={filters.fertility} onValueChange={set("fertility")}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="élevée">Élevée</SelectItem>
                <SelectItem value="moyenne">Moyenne</SelectItem>
                <SelectItem value="faible">Faible</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </CardContent>
    </Card>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <Label className="text-xs text-stone-600">{label}</Label>
    {children}
  </div>
);

export default RegionFilterBar;
