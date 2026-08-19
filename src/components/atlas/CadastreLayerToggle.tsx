import { Layers3, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

type Props = {
  enabled: boolean;
  onToggle: (v: boolean) => void;
  opacity: number;
  onOpacityChange: (v: number) => void;
};

const CadastreLayerToggle = ({ enabled, onToggle, opacity, onOpacityChange }: Props) => (
  <div className="absolute top-3 right-3 z-[1000] w-60 rounded-md border border-stone-200 bg-white/95 px-3 py-2.5 shadow-md backdrop-blur">
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Layers3 className="h-4 w-4 text-emerald-700" />
        <span className="text-xs font-semibold text-stone-800">Cadastre national</span>
      </div>
      <Switch checked={enabled} onCheckedChange={onToggle} aria-label="Afficher la couche cadastre" />
    </div>

    {enabled && (
      <div className="mt-2.5 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-stone-500">Opacité</span>
          <Slider
            value={[Math.round(opacity * 100)]}
            min={10}
            max={100}
            step={5}
            onValueChange={([v]) => onOpacityChange(v / 100)}
            className="flex-1"
          />
          <span className="w-8 text-right text-[11px] tabular-nums text-stone-600">
            {Math.round(opacity * 100)}%
          </span>
        </div>
        <p className="text-[10px] leading-snug text-stone-500">
          Parcellaire visible à partir du zoom 14. Source&nbsp;:{" "}
          <a
            href="https://cadastre.bj"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-emerald-700"
          >
            cadastre.bj
          </a>{" "}
          (ANDF).
        </p>
      </div>
    )}

    <p className="mt-2 flex items-start gap-1 text-[10px] leading-snug text-stone-500">
      <Info className="mt-0.5 h-3 w-3 shrink-0" />
      Affichage indicatif, sans valeur juridique. Seule l'ANDF fait foi.
    </p>
  </div>
);

export default CadastreLayerToggle;
