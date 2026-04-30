import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gauge, AlertTriangle } from "lucide-react";
import type { RecommendedCropEntry } from "@/lib/atlas";

const confLabel = { high: "Confiance élevée", medium: "Confiance moyenne", low: "Confiance faible" } as const;
const confStyle: Record<string, string> = {
  high: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-stone-100 text-stone-700",
};

type Props = {
  crop: RecommendedCropEntry;
  confidence?: "low" | "medium" | "high" | null;
  assumptions?: string[];
};

const YieldEstimateCard = ({ crop, confidence, assumptions }: Props) => (
  <Card className="border-emerald-200">
    <CardHeader>
      <div className="flex items-center justify-between gap-3">
        <CardTitle className="text-lg text-emerald-900 flex items-center gap-2">
          <Gauge className="h-5 w-5" />
          Estimation de rendement — {crop.crop_name}
        </CardTitle>
        {confidence && (
          <Badge className={confStyle[confidence] + " border-0"}>{confLabel[confidence]}</Badge>
        )}
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-stone-500">Fourchette attendue</p>
        <p className="text-3xl font-semibold text-emerald-900">{crop.expected_yield_range}</p>
      </div>
      {assumptions && assumptions.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-stone-500 mb-2">Hypothèses clés</p>
          <ul className="space-y-1">
            {assumptions.map((a) => (
              <li key={a} className="text-sm text-stone-700 flex gap-2">
                <span className="text-emerald-600">•</span>{a}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex gap-2 rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <span>Estimation indicative. À valider par essais terrain et conseil agronomique local.</span>
      </div>
    </CardContent>
  </Card>
);

export default YieldEstimateCard;
