import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, Trash2, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import RegionDetailsPanel from "@/components/atlas/RegionDetailsPanel";
import OfflineStatusBanner, { OnlineDot } from "@/components/atlas/OfflineStatusBanner";
import {
  listOfflineRegions,
  removeOfflineRegion,
  type OfflineRegionPayload,
} from "@/lib/offlineAtlas";
import type { BeninRegion } from "@/lib/beninRegions";
import { toast } from "sonner";

const formatSyncedAt = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

const OfflineAtlas = () => {
  const [items, setItems] = useState<OfflineRegionPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [openRegion, setOpenRegion] = useState<BeninRegion | null>(null);
  const [openSyncedAt, setOpenSyncedAt] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await listOfflineRegions();
      setItems(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleOpen = (p: OfflineRegionPayload) => {
    if (!p.static_region) {
      toast.error("Cette région ne contient pas de fiche affichable");
      return;
    }
    setOpenRegion(p.static_region);
    setOpenSyncedAt(p.synced_at);
    setTimeout(() => {
      document.getElementById("offline-detail")?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  const handleRemove = async (id: string) => {
    await removeOfflineRegion(id);
    if (openRegion?.id === id) {
      setOpenRegion(null);
      setOpenSyncedAt(null);
    }
    await refresh();
    toast.success("Région supprimée du cache local");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white pb-12">
      <header className="border-b border-stone-200 bg-white">
        <div className="container mx-auto max-w-5xl px-4 py-5">
          <Link
            to="/atlas"
            className="text-sm text-stone-500 hover:text-emerald-700 inline-flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Atlas
          </Link>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-emerald-100 p-2.5">
                <Download className="h-6 w-6 text-emerald-700" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-emerald-950">Bibliothèque hors-ligne</h1>
                <p className="text-stone-600 mt-1 text-sm">
                  Régions téléchargées sur cet appareil. Disponibles sans connexion.
                </p>
              </div>
            </div>
            <OnlineDot />
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 py-6 space-y-4">
        <OfflineStatusBanner />

        {loading ? (
          <p className="text-sm text-stone-500">Chargement…</p>
        ) : items.length === 0 ? (
          <Card className="border-dashed border-stone-300">
            <CardContent className="pt-8 pb-8 text-center text-sm text-stone-500 space-y-2">
              <MapPin className="h-8 w-8 mx-auto text-stone-400" />
              <p>Aucune région téléchargée pour le moment.</p>
              <p>
                Ouvrez l'<Link to="/atlas" className="text-emerald-700 underline">Atlas</Link> et
                cliquez sur « Télécharger » pour rendre une région disponible hors-ligne.
              </p>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-2">
            {items.map((p) => (
              <li key={p.region_id}>
                <Card>
                  <CardContent className="p-3 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleOpen(p)}
                      className="flex-1 min-w-0 text-left flex items-center gap-3 min-h-[48px]"
                    >
                      <MapPin className="h-5 w-5 text-emerald-700 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-stone-900 truncate">{p.region_name}</p>
                        <p className="text-[11px] text-stone-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Synchronisé le {formatSyncedAt(p.synced_at)}
                        </p>
                      </div>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(p.region_id)}
                      className="text-stone-500 hover:text-red-600 hover:bg-red-50 min-h-[44px] min-w-[44px]"
                      aria-label={`Supprimer ${p.region_name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}

        {openRegion && (
          <div id="offline-detail" className="pt-4 space-y-2">
            <p className="text-xs text-stone-500 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Dernière synchronisation : {openSyncedAt ? formatSyncedAt(openSyncedAt) : "—"}
            </p>
            <RegionDetailsPanel region={openRegion} />
          </div>
        )}
      </main>
    </div>
  );
};

export default OfflineAtlas;
