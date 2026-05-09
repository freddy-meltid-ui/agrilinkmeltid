import { Bookmark, Download, Store, MessageCircle } from "lucide-react";
import type { BeninRegion } from "@/lib/beninRegions";
import { exportRegionPdf } from "@/lib/exportRegionPdf";
import { toast } from "sonner";
import { Link } from "react-router-dom";

type Props = {
  region: BeninRegion | null;
};

const AtlasBottomBar = ({ region }: Props) => {
  const disabled = !region;

  const handleSave = () => {
    if (!region) return;
    try {
      const raw = localStorage.getItem("atlas:saved") || "[]";
      const list = JSON.parse(raw) as string[];
      if (!list.includes(region.id)) list.push(region.id);
      localStorage.setItem("atlas:saved", JSON.stringify(list));
      toast.success(`${region.name} enregistrée`);
    } catch {
      toast.error("Échec de l'enregistrement");
    }
  };

  const handleDownload = () => {
    if (!region) return;
    try {
      exportRegionPdf(region);
      toast.success("Fiche téléchargée");
    } catch {
      toast.error("Échec du téléchargement");
    }
  };

  const waText = region
    ? `Bonjour, je consulte AgriGrid Atlas pour la région ${region.name}. Pouvez-vous m'aider ?`
    : "Bonjour, j'ai une question sur AgriGrid Atlas.";
  const waHref = `https://wa.me/?text=${encodeURIComponent(waText)}`;
  const resourcesHref = region
    ? `/marketplace?location=${encodeURIComponent(region.name)}`
    : "/marketplace";

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 border-t border-stone-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 lg:hidden">
      <div className="grid grid-cols-4 max-w-2xl mx-auto">
        <Action
          icon={Bookmark}
          label="Enregistrer"
          onClick={handleSave}
          disabled={disabled}
        />
        <Action
          icon={Download}
          label="Hors-ligne"
          onClick={handleDownload}
          disabled={disabled}
        />
        <ActionLink icon={Store} label="Ressources" to={resourcesHref} />
        <ActionLink
          icon={MessageCircle}
          label="WhatsApp"
          href={waHref}
          external
          accent
        />
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
};

const baseBtn =
  "flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[60px] text-[11px] font-medium transition-colors active:bg-stone-100";

const Action = ({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: any;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`${baseBtn} ${disabled ? "text-stone-300" : "text-stone-700"}`}
  >
    <Icon className="h-5 w-5" />
    {label}
  </button>
);

const ActionLink = ({
  icon: Icon,
  label,
  to,
  href,
  external,
  accent,
}: {
  icon: any;
  label: string;
  to?: string;
  href?: string;
  external?: boolean;
  accent?: boolean;
}) => {
  const className = `${baseBtn} ${accent ? "text-emerald-700" : "text-stone-700"}`;
  if (external && href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        <Icon className="h-5 w-5" />
        {label}
      </a>
    );
  }
  return (
    <Link to={to ?? "#"} className={className}>
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
};

export default AtlasBottomBar;
