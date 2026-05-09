import { useMemo, useState } from "react";
import { Search, MapPin, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { BeninRegion, Level } from "@/lib/beninRegions";

const potentialClass = (l: Level) => {
  if (l === "élevée") return "bg-emerald-100 text-emerald-800";
  if (l === "moyenne") return "bg-amber-100 text-amber-800";
  return "bg-stone-100 text-stone-700";
};

type Props = {
  regions: BeninRegion[];
  selected: BeninRegion | null;
  onSelect: (r: BeninRegion) => void;
};

const RegionList = ({ regions, selected, onSelect }: Props) => {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return regions;
    return regions.filter(
      (r) =>
        r.name.toLowerCase().includes(s) ||
        r.agroecological_zone.toLowerCase().includes(s) ||
        r.recommended_crops.some((c) => c.crop_name.toLowerCase().includes(s))
    );
  }, [regions, q]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher une région ou une culture…"
          className="pl-9 h-12 text-base"
          inputMode="search"
          aria-label="Rechercher une région"
        />
      </div>
      <ul className="divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white overflow-hidden">
        {filtered.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-stone-500">Aucun résultat</li>
        )}
        {filtered.map((r) => {
          const isSel = selected?.id === r.id;
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onSelect(r)}
                className={`w-full flex items-center gap-3 px-4 py-3 min-h-[56px] text-left active:bg-emerald-50 transition-colors ${
                  isSel ? "bg-emerald-50" : "bg-white"
                }`}
              >
                <MapPin
                  className={`h-5 w-5 flex-shrink-0 ${
                    isSel ? "text-emerald-700" : "text-stone-400"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-stone-900 truncate">{r.name}</p>
                    <Badge className={`${potentialClass(r.potential_level)} text-[10px] px-1.5 py-0`}>
                      {r.potential_level}
                    </Badge>
                  </div>
                  <p className="text-xs text-stone-500 truncate">{r.agroecological_zone}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-stone-400 flex-shrink-0" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default RegionList;
