import { Badge } from "@/components/ui/badge";
import type { RecommendedCrop } from "@/lib/beninRegions";
import { Sprout } from "lucide-react";

const suitabilityClass = (s: RecommendedCrop["suitability"]) => {
  if (s === "élevée") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (s === "moyenne") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-stone-100 text-stone-700 border-stone-200";
};

const CropRecommendationCard = ({ crop }: { crop: RecommendedCrop }) => (
  <div className="rounded-md border border-stone-200 bg-white p-3 space-y-1.5">
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Sprout className="h-4 w-4 text-emerald-600" />
        <p className="font-medium text-stone-900 text-sm">{crop.crop_name}</p>
      </div>
      <Badge variant="outline" className={suitabilityClass(crop.suitability)}>
        {crop.suitability}
      </Badge>
    </div>
    <p className="text-xs text-stone-600">
      <span className="font-medium text-stone-700">Rendement :</span> {crop.expected_yield_range}
    </p>
    <p className="text-xs text-stone-600">
      <span className="font-medium text-stone-700">Contraintes :</span> {crop.key_constraints}
    </p>
    <p className="text-xs text-emerald-800 italic">{crop.recommendation}</p>
  </div>
);

export default CropRecommendationCard;
