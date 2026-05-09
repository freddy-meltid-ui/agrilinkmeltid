import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Droplets, Layers, Sprout, FileDown, Download, CheckCircle2 } from "lucide-react";
import type { BeninRegion } from "@/lib/beninRegions";
import CropRecommendationCard from "./CropRecommendationCard";
import YieldPotentialCard from "./YieldPotentialCard";
import { exportRegionPdf } from "@/lib/exportRegionPdf";
import { toast } from "sonner";
import {
  buildPayloadFromStatic,
  isRegionOffline,
  saveOfflineRegion,
} from "@/lib/offlineAtlas";

const levelClass = (lvl: string) => {
  if (lvl === "élevée" || lvl === "élevé") return "bg-emerald-100 text-emerald-800";
  if (lvl === "moyenne" || lvl === "moyen") return "bg-amber-100 text-amber-800";
  return "bg-stone-100 text-stone-700";
};

const RegionDetailsPanel = ({ region }: { region: BeninRegion | null }) => {
  const [downloaded, setDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!region) {
      setDownloaded(false);
      return;
    }
    isRegionOffline(region.id).then((v) => {
      if (active) setDownloaded(v);
    });
    return () => {
      active = false;
    };
  }, [region]);

  if (!region) {
    return (
      <Card className="border-dashed border-stone-300">
        <CardContent className="pt-8 pb-8 text-center text-sm text-stone-500">
          <MapPin className="h-8 w-8 mx-auto mb-2 text-stone-400" />
          Cliquez sur une région de la carte pour afficher ses détails agronomiques.
        </CardContent>
      </Card>
    );
  }

  const handleExport = () => {
    try {
      exportRegionPdf(region);
      toast.success(`Fiche PDF de ${region.name} générée`);
    } catch (e) {
      toast.error("Échec de l'export PDF");
    }
  };

  const handleDownloadOffline = async () => {
    setDownloading(true);
    try {
      await saveOfflineRegion(buildPayloadFromStatic(region));
      setDownloaded(true);
      toast.success(`${region.name} disponible hors-ligne`);
    } catch {
      toast.error("Échec du téléchargement hors-ligne");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-emerald-100">
        <CardContent className="pt-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-stone-500">{region.country}</p>
              <h2 className="text-xl font-semibold text-emerald-950">{region.name}</h2>
              <p className="text-sm text-stone-600 mt-0.5">{region.agroecological_zone}</p>
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              <Button
                variant="outline"
                onClick={handleExport}
                className="border-emerald-300 text-emerald-800 hover:bg-emerald-50 min-h-[44px]"
              >
                <FileDown className="h-4 w-4 mr-1.5" />
                PDF
              </Button>
              <Button
                variant={downloaded ? "secondary" : "default"}
                onClick={handleDownloadOffline}
                disabled={downloading}
                className={`min-h-[44px] ${
                  downloaded
                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                    : "bg-emerald-700 hover:bg-emerald-800 text-white"
                }`}
              >
                {downloaded ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Hors-ligne
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-1.5" />
                    {downloading ? "…" : "Télécharger"}
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat icon={Droplets} label="Pluviométrie" value={region.rainfall_mm} />
            <Stat icon={Layers} label="Sol dominant" value={region.dominant_soil} />
            <div>
              <p className="text-xs text-stone-500 mb-1">Fertilité</p>
              <Badge className={levelClass(region.fertility_level)}>{region.fertility_level}</Badge>
            </div>
            <div>
              <p className="text-xs text-stone-500 mb-1">Irrigation</p>
              <Badge className={levelClass(region.irrigation_potential)}>{region.irrigation_potential}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <YieldPotentialCard region={region} />

      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <Sprout className="h-4 w-4 text-emerald-700" />
          <p className="text-sm font-semibold text-emerald-900">
            Cultures recommandées ({region.recommended_crops.length})
          </p>
        </div>
        <div className="space-y-2">
          {region.recommended_crops.map((c) => (
            <CropRecommendationCard key={c.crop_name} crop={c} />
          ))}
        </div>
      </div>
    </div>
  );
};

const Stat = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div>
    <p className="text-xs text-stone-500 mb-0.5 flex items-center gap-1">
      <Icon className="h-3 w-3" /> {label}
    </p>
    <p className="text-stone-800 text-sm">{value}</p>
  </div>
);

export default RegionDetailsPanel;
