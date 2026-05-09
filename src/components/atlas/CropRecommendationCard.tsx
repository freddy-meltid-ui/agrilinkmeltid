import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  ChevronDown,
  Lightbulb,
  HeartHandshake,
  PackageSearch,
} from "lucide-react";
import { Link } from "react-router-dom";
import { enqueueAction, syncAction } from "@/lib/offlineQueue";
import { toast } from "sonner";

const suitabilityClass = (s: RecommendedCrop["suitability"]) => {
  if (s === "élevée") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (s === "moyenne") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-stone-100 text-stone-700 border-stone-200";
};

const confidenceClass = (c: string | null | undefined) => {
  if (c === "high") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (c === "medium") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-stone-100 text-stone-700 border-stone-200";
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

const fmtScore = (n: number | null | undefined) => (n == null ? "—" : `${Math.round(n)}`);

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
  regionId,
  regionName,
  cropId,
}: {
  crop: RecommendedCrop;
  intelligence?: CropIntelligence;
  regionId?: string | null;
  regionName?: string | null;
  cropId?: string | null;
}) => {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const cropParam = encodeURIComponent(crop.crop_name);
  const score = intelligence?.score ?? null;
  const yieldEst = intelligence?.yield ?? null;
  const price = intelligence?.price ?? null;
  const demand = intelligence?.demand ?? null;
  const season = intelligence?.seasonality ?? null;
  const explanation = score?.explanation_json ?? null;

  // Farmer View: simple planting window
  const plantingWindow =
    season?.planting_window_start && season?.planting_window_end
      ? `${season.planting_window_start} → ${season.planting_window_end}`
      : "Données indisponibles";

  // Why simple: prefer explanation.why_crop, fall back to recommendation
  const whySimple =
    explanation?.why_crop || crop.recommendation || "Adaptée à la zone et au sol locaux.";

  // Main risk: first risk factor / constraint
  const mainRisk = crop.key_constraints || "Aucun risque majeur signalé";

  // Estimated revenue
  let revenueLine: string | null = null;
  if (yieldEst?.yield_min_t_ha != null && yieldEst?.yield_max_t_ha != null && price) {
    const mid = (yieldEst.yield_min_t_ha + yieldEst.yield_max_t_ha) / 2;
    const revenue = Math.round(mid * 1000 * price.price);
    revenueLine = `~${revenue.toLocaleString("fr-FR")} ${price.currency} / ha`;
  }

  const hasAdvanced =
    !!score ||
    !!revenueLine ||
    !!demand ||
    (yieldEst && (yieldEst.yield_min_t_ha != null || yieldEst.yield_max_t_ha != null));

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sprout className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <p className="font-semibold text-stone-900 text-base truncate">{crop.crop_name}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
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

      {/* Farmer View — always visible, simple language */}
      <div className="rounded-md bg-emerald-50/60 border border-emerald-100 p-3 space-y-2.5">
        <FarmerRow icon={CalendarDays} label="Période de semis">
          <span className="text-stone-800">{plantingWindow}</span>
        </FarmerRow>
        <FarmerRow icon={Lightbulb} label="Pourquoi cette culture ?">
          <span className="text-stone-700">{whySimple}</span>
        </FarmerRow>
        <FarmerRow icon={AlertTriangle} label="Risque principal" iconClass="text-amber-600">
          <span className="text-stone-700">{mainRisk}</span>
        </FarmerRow>
        <FarmerRow icon={ShoppingCart} label="Action suivante">
          <Link
            to={`/marketplace?type=produce&crop=${cropParam}`}
            className="inline-flex items-center gap-1 text-emerald-800 font-medium underline underline-offset-2"
          >
            Trouver acheteurs et ressources
          </Link>
        </FarmerRow>
      </div>

      {/* Advanced details — collapsible */}
      {hasAdvanced && (
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-between min-h-[40px] text-stone-700 hover:bg-stone-50"
            >
              <span className="text-xs font-semibold uppercase tracking-wide">
                Détails agronomiques
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
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
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <Activity className="h-3 w-3 text-stone-500" />
                <span className="text-stone-700 font-medium">Demande :</span>
                <Badge className={demandClass(demand.demand_level)}>{demand.demand_level}</Badge>
                <span className="text-stone-500">
                  {demand.buyer_count} acheteurs · {demand.listing_count} annonces
                </span>
              </div>
            )}

            {score && (
              <div className="space-y-1.5 pt-1">
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

            {explanation?.why_region && (
              <div>
                <p className="text-[11px] uppercase tracking-wide font-semibold text-stone-500">
                  Pourquoi cette région ?
                </p>
                <p className="text-xs text-stone-700">{explanation.why_region}</p>
              </div>
            )}

            {explanation?.uncertainties && explanation.uncertainties.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wide font-semibold text-stone-500 flex items-center gap-1 mb-1">
                  <AlertTriangle className="h-3 w-3 text-amber-600" /> Incertitudes
                </p>
                <ul className="text-xs text-stone-600 list-disc pl-4 space-y-0.5">
                  {explanation.uncertainties.map((u, i) => (
                    <li key={i}>{u}</li>
                  ))}
                </ul>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Field-agent actions: queued offline, synced when online */}
      <FieldActions
        crop={crop}
        regionId={regionId ?? null}
        regionName={regionName ?? null}
        cropId={cropId ?? null}
      />

      {/* Next actions — thumb friendly */}
      <div className="pt-2 border-t border-stone-100">
        <p className="text-[11px] uppercase tracking-wide font-semibold text-stone-500 mb-2">
          Prochaines actions
        </p>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {NEXT_ACTIONS.map(({ type, label, icon: Icon }) => (
            <Link
              key={type}
              to={`/marketplace?type=${type}&crop=${cropParam}`}
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 text-xs font-medium px-3 py-2 min-h-[40px] transition-colors"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

const FarmerRow = ({
  icon: Icon,
  label,
  children,
  iconClass = "text-emerald-700",
}: {
  icon: any;
  label: string;
  children: React.ReactNode;
  iconClass?: string;
}) => (
  <div className="flex items-start gap-2 text-sm">
    <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${iconClass}`} />
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide font-semibold text-stone-500">{label}</p>
      <div className="text-sm leading-snug">{children}</div>
    </div>
  </div>
);

export default CropRecommendationCard;
