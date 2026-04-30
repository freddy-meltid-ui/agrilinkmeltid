import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bookmark, Sprout } from "lucide-react";
import { saveRecommendation, type RecommendedCropEntry } from "@/lib/atlas";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useState } from "react";

const suitabilityStyles: Record<string, string> = {
  high: "bg-emerald-100 text-emerald-800 border-emerald-300",
  medium: "bg-amber-100 text-amber-800 border-amber-300",
  low: "bg-stone-100 text-stone-700 border-stone-300",
};
const suitabilityLabel: Record<string, string> = { high: "Aptitude élevée", medium: "Aptitude moyenne", low: "Aptitude faible" };

const RecommendationCard = ({ crop, regionId }: { crop: RecommendedCropEntry; regionId: string }) => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) { toast.error("Connectez-vous pour sauvegarder"); return; }
    setSaving(true);
    try {
      await saveRecommendation(regionId, crop.crop_id);
      toast.success("Recommandation sauvegardée");
    } catch (e: any) {
      toast.error(e.message ?? "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-stone-200 hover:border-emerald-300 transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base text-stone-900 flex items-center gap-2">
            <Sprout className="h-4 w-4 text-emerald-700" />
            {crop.crop_name}
          </CardTitle>
          <Badge variant="outline" className={suitabilityStyles[crop.suitability]}>
            {suitabilityLabel[crop.suitability]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-stone-700">{crop.recommendation || "Pas de note spécifique."}</p>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-stone-500 uppercase tracking-wide">Rendement</p>
            <p className="font-medium text-stone-900">{crop.expected_yield_range}</p>
          </div>
          <div>
            <p className="text-stone-500 uppercase tracking-wide">Pluviométrie</p>
            <p className="font-medium text-stone-900">{crop.required_rainfall}</p>
          </div>
        </div>
        {crop.constraints.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {crop.constraints.map((c) => (
              <Badge key={c} variant="secondary" className="bg-amber-50 text-amber-800 border border-amber-200">
                {c}
              </Badge>
            ))}
          </div>
        )}
        <Button size="sm" variant="outline" onClick={handleSave} disabled={saving} className="w-full">
          <Bookmark className="h-4 w-4" />
          {saving ? "Enregistrement..." : "Sauvegarder"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default RecommendationCard;
