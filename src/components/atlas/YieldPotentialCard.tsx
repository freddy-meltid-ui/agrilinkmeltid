import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import type { BeninRegion } from "@/lib/beninRegions";

const YieldPotentialCard = ({ region }: { region: BeninRegion }) => {
  const top = [...region.recommended_crops]
    .filter((c) => c.suitability === "élevée")
    .slice(0, 3);
  return (
    <Card className="border-emerald-100">
      <CardContent className="pt-5 space-y-2">
        <div className="flex items-center gap-2 text-emerald-800">
          <TrendingUp className="h-4 w-4" />
          <p className="text-sm font-semibold">Potentiel de rendement</p>
        </div>
        {top.length === 0 && (
          <p className="text-xs text-stone-500">Aucune culture à fort potentiel identifiée.</p>
        )}
        <ul className="space-y-1">
          {top.map((c) => (
            <li key={c.crop_name} className="flex justify-between text-xs">
              <span className="text-stone-700">{c.crop_name}</span>
              <span className="font-medium text-emerald-700">{c.expected_yield_range}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default YieldPotentialCard;
