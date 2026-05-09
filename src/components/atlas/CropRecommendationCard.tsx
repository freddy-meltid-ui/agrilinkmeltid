import { Badge } from "@/components/ui/badge";
import type { RecommendedCrop } from "@/lib/beninRegions";
import type {
  RecommendationScore,
  YieldEstimate,
  CropPrice,
  DemandSignal,
  SeasonalityProfile,
} from "@/lib/atlas";
import {
  Sprout,
  Wrench,
  Users,
  Warehouse,
  Truck,
  ShoppingCart,
  TrendingUp,
  CalendarDays,
  AlertTriangle,
  Coins,
  Activity,
} from "lucide-react";
import { Link } from "react-router-dom";

const suitabilityClass = (s: RecommendedCrop["suitability"]) => {
  if (s === "élevée") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (s === "moyenne") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-stone-100 text-stone-700 border-stone-200";
};

const confidenceClass = (c: string | null | undefined) => {
  if (c === "high") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (c === "medium") return "bg-amber-100 text-amber-800 border-amber-200";
  if (c === "low") return "bg-stone-100 text-stone-700 border-stone-200";
  return "bg-stone-100 text-stone-600 border-stone-200";
};

const confidenceLabel = (c: string | null | undefined) => {
  if (c === "high") return "Confiance élevée";
  if (c === "medium") return "Confiance moyenne";
  if (c === "low") return "Confiance faible";
  return "Confiance n/d";
};

const demandClass = (lvl: string | undefined) => {
  if (lvl === "high") return "bg-emerald-100 text-emerald-800";
  if (lvl === "medium") return "bg-amber-100 text-amber-800";
  return "bg-stone-100 text-stone-700";
};

const NEXT_ACTIONS = [
  { type: "equipment", label: "Équipement", icon: Wrench },
  { type: "job", label: "Main-d'œuvre", icon: Users },
  { type: "warehouse", label: "Stockage", icon: Warehouse },
  { type: "transport", label: "Transport", icon: Truck },
  { type: "produce", label: "Acheteurs", icon: ShoppingCart },
] as const;

export type CropIntelligence = {
  score?: RecommendationScore | null;
  yield?: YieldEstimate | null;
  price?: CropPrice | null;
  demand?: DemandSignal | null;
  seasonality?: SeasonalityProfile | null;
};

const fmtScore = (n: number | null | undefined) =>
  n == null ? "—" : `${Math.round(n)}`;

const ScoreBar = ({ label, value }: { label: string; value: number | null | undefined }) => (
  <div className="space-y-0.5">
    <div className="flex justify-between text-[11px] text-stone-600">
      <span>{label}</span>
      <span className="font-medium text-stone-800">{fmtScore(value)}</span>
    </div>
    <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
      <div
        className="h-full bg-emerald-500"
        style={{ width: `${Math.min(100, Math.max(0, value ?? 0))}%` }}
      />
    </div>
  </div>
);

const CropRecommendationCard = ({
  crop,
  intelligence,
}: {
  crop: RecommendedCrop;
  intelligence?: CropIntelligence;
}) => {
  const cropParam = encodeURIComponent(crop.crop_name);
  const score = intelligence?.score ?? null;
  const yieldEst = intelligence?.yield ?? null;
  const price = intelligence?.price ?? null;
  const demand = intelligence?.demand ?? null;
  const season = intelligence?.seasonality ?? null;
  const explanation = score?.explanation_json ?? null;

  // Estimated revenue: midpoint yield (t/ha) * 1000 (kg) * price (per kg)
  let revenueLine: string | null = null;
  if (yieldEst?.yield_min_t_ha != null && yieldEst?.yield_max_t_ha != null && price) {
    const mid = (yieldEst.yield_min_t_ha + yieldEst.yield_max_t_ha) / 2;
    const perKg =
      price.unit?.toLowerCase().includes("kg") ? price.price : price.price; // assume per kg by default
    const revenue = Math.round(mid * 1000 * perKg);
    revenueLine = `~${revenue.toLocaleString("fr-FR")} ${price.currency} / ha`;
  }

  return (
    <div className="rounded-md border border-stone-200 bg-white p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sprout className="h-4 w-4 text-emerald-600" />
          <p className="font-medium text-stone-900 text-sm">{crop.crop_name}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {score?.final_score != null && (
            <Badge variant="outline" className="bg-emerald-600 text-white border-emerald-600">
              {fmtScore(score.final_score)}/100
            </Badge>
          )}
          <Badge variant="outline" className={suitabilityClass(crop.suitability)}>
            {crop.suitability}
          </Badge>
        </div>
      </div>

      {score && (
        <Badge variant="outline" className={confidenceClass(score.confidence)}>
          {confidenceLabel(score.confidence)}
        </Badge>
      )}

      <p className="text-xs text-stone-600">
        <span className="font-medium text-stone-700">Rendement :</span>{" "}
        {yieldEst?.yield_min_t_ha != null && yieldEst?.yield_max_t_ha != null
          ? `${yieldEst.yield_min_t_ha}–${yieldEst.yield_max_t_ha} t/ha`
          : crop.expected_yield_range || "Données indisponibles"}
      </p>

      {revenueLine && (
        <p className="text-xs text-stone-600 flex items-center gap-1">
          <Coins className="h-3 w-3 text-amber-600" />
          <span className="font-medium text-stone-700">Revenu estimé :</span> {revenueLine}
        </p>
      )}

      {demand && (
        <div className="flex items-center gap-1.5 text-xs">
          <Activity className="h-3 w-3 text-stone-500" />
          <span className="text-stone-700 font-medium">Demande :</span>
          <Badge className={demandClass(demand.demand_level)}>{demand.demand_level}</Badge>
          <span className="text-stone-500">
            {demand.buyer_count} acheteurs · {demand.listing_count} annonces
          </span>
        </div>
      )}

      <p className="text-xs text-stone-600">
        <span className="font-medium text-stone-700">Contraintes :</span> {crop.key_constraints}
      </p>

      {score && (
        <div className="pt-2 border-t border-stone-100 space-y-1.5">
          <p className="text-[11px] uppercase tracking-wide font-semibold text-stone-500 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Détail du score
          </p>
          <ScoreBar label="Sol" value={score.soil_score} />
          <ScoreBar label="Pluviométrie" value={score.rainfall_score} />
          <ScoreBar label="Saisonnalité" value={score.seasonality_score} />
          <ScoreBar label="Rendement" value={score.yield_score} />
          <ScoreBar label="Marché" value={score.market_score} />
          <ScoreBar label="Risque" value={score.risk_score} />
        </div>
      )}

      {(explanation?.why_crop || explanation?.why_region || explanation?.why_season) && (
        <div className="pt-2 border-t border-stone-100 space-y-1.5">
          {explanation?.why_crop && (
            <Explanation title="Pourquoi cette culture ?" text={explanation.why_crop} />
          )}
          {explanation?.why_region && (
            <Explanation title="Pourquoi cette région ?" text={explanation.why_region} />
          )}
          {explanation?.why_season && (
            <Explanation
              title="Pourquoi cette saison ?"
              text={explanation.why_season}
              icon={CalendarDays}
            />
          )}
        </div>
      )}

      {season && (season.planting_window_start || season.harvest_window_start) && (
        <p className="text-xs text-stone-600 flex items-center gap-1">
          <CalendarDays className="h-3 w-3 text-emerald-700" />
          <span className="font-medium text-stone-700">Fenêtre :</span>
          {season.planting_window_start && season.planting_window_end
            ? ` Semis ${season.planting_window_start}→${season.planting_window_end}`
            : ""}
          {season.harvest_window_start && season.harvest_window_end
            ? ` · Récolte ${season.harvest_window_start}→${season.harvest_window_end}`
            : ""}
        </p>
      )}

      {explanation?.uncertainties && explanation.uncertainties.length > 0 && (
        <div className="pt-2 border-t border-stone-100">
          <p className="text-[11px] uppercase tracking-wide font-semibold text-stone-500 flex items-center gap-1 mb-1">
            <AlertTriangle className="h-3 w-3 text-amber-600" /> Principales incertitudes
          </p>
          <ul className="text-xs text-stone-600 list-disc pl-4 space-y-0.5">
            {explanation.uncertainties.map((u, i) => (
              <li key={i}>{u}</li>
            ))}
          </ul>
        </div>
      )}

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

const Explanation = ({
  title,
  text,
  icon: Icon,
}: {
  title: string;
  text: string;
  icon?: any;
}) => (
  <div>
    <p className="text-[11px] uppercase tracking-wide font-semibold text-stone-500 flex items-center gap-1">
      {Icon && <Icon className="h-3 w-3" />} {title}
    </p>
    <p className="text-xs text-stone-700">{text}</p>
  </div>
);

export default CropRecommendationCard;
