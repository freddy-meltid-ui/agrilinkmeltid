import { Badge } from "@/components/ui/badge";
import type { RecommendedCrop } from "@/lib/beninRegions";
import { Sprout, Wrench, Users, Warehouse, Truck, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";

const suitabilityClass = (s: RecommendedCrop["suitability"]) => {
  if (s === "élevée") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (s === "moyenne") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-stone-100 text-stone-700 border-stone-200";
};

const NEXT_ACTIONS = [
  { type: "equipment", label: "Équipement", icon: Wrench },
  { type: "job", label: "Main-d'œuvre", icon: Users },
  { type: "warehouse", label: "Stockage", icon: Warehouse },
  { type: "transport", label: "Transport", icon: Truck },
  { type: "produce", label: "Acheteurs", icon: ShoppingCart },
] as const;

const CropRecommendationCard = ({ crop }: { crop: RecommendedCrop }) => {
  const cropParam = encodeURIComponent(crop.crop_name);
  return (
    <div className="rounded-md border border-stone-200 bg-white p-3 space-y-2">
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

      <div className="pt-2 border-t border-stone-100">
        <p className="text-[11px] uppercase tracking-wide font-semibold text-stone-500 mb-1.5">
          Prochaines actions
        </p>
        <div className="flex flex-wrap gap-1.5">
          {NEXT_ACTIONS.map(({ type, label, icon: Icon }) => (
            <Link
              key={type}
              to={`/marketplace?type=${type}&crop=${cropParam}`}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] px-2 py-0.5 transition-colors"
            >
              <Icon className="h-3 w-3" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CropRecommendationCard;
