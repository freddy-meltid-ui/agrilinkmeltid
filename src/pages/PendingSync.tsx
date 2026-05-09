import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw, Trash2, CheckCircle2, Clock, AlertCircle, Loader2, CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import { removeFromQueue, syncAction, type QueuedAction } from "@/lib/offlineQueue";
import { toast } from "sonner";

const fmt = (iso: string | null) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

const typeLabel = (t: QueuedAction["type"]) =>
  t === "farmer_interest" ? "Intérêt agriculteur" : "Visite terrain";

const statusBadge = (s: QueuedAction["status"]) => {
  if (s === "synced")
    return (
      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
        <CheckCircle2 className="h-3 w-3 mr-1" /> Synchronisé
      </Badge>
    );
  if (s === "syncing")
    return (
      <Badge className="bg-blue-100 text-blue-800 border-blue-200">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" /> En cours
      </Badge>
    );
  if (s === "failed")
    return (
      <Badge className="bg-red-100 text-red-800 border-red-200">
        <AlertCircle className="h-3 w-3 mr-1" /> Échec
      </Badge>
    );
  return (
    <Badge className="bg-amber-100 text-amber-800 border-amber-200">
      <Clock className="h-3 w-3 mr-1" /> En attente
    </Badge>
  );
};

const PendingSync = () => {
  const { items, online, syncing, pending, failed, synced, runSync, refresh } = useSyncQueue();

  const handleRetry = async (a: QueuedAction) => {
    if (!online) {
      toast.error("Connexion requise pour réessayer");
      return;
    }
    const result = await syncAction(a);
    await refresh();
    if (result.status === "synced") toast.success("Action synchronisée");
    else toast.error(`Échec : ${result.last_error ?? "erreur inconnue"}`);
  };

  const handleRemove = async (id: string) => {
    await removeFromQueue(id);
    toast.success("Action supprimée");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white pb-12">
      <header className="border-b border-stone-200 bg-white">
        <div className="container mx-auto max-w-3xl px-4 py-5">
          <Link
            to="/atlas"
            className="text-sm text-stone-500 hover:text-emerald-700 inline-flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Atlas
          </Link>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl font-semibold text-emerald-950">Synchronisation</h1>
              <p className="text-stone-600 mt-1 text-sm">
                Actions enregistrées localement, en attente d'envoi au serveur.
              </p>
            </div>
            <Button
              onClick={runSync}
              disabled={!online || syncing || pending + failed === 0}
              className="bg-emerald-700 hover:bg-emerald-800 text-white min-h-[44px]"
            >
              {syncing ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1.5" />
              )}
              Tout synchroniser
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Badge className="bg-amber-100 text-amber-800">{pending} en attente</Badge>
            <Badge className="bg-red-100 text-red-800">{failed} en échec</Badge>
            <Badge className="bg-emerald-100 text-emerald-800">{synced} synchronisé</Badge>
            {!online && (
              <Badge className="bg-stone-100 text-stone-700">
                <CloudOff className="h-3 w-3 mr-1" /> Hors-ligne
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-6 space-y-3">
        {items.length === 0 ? (
          <Card className="border-dashed border-stone-300">
            <CardContent className="pt-8 pb-8 text-center text-sm text-stone-500">
              Aucune action en attente.
            </CardContent>
          </Card>
        ) : (
          items.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-stone-900 text-sm">{typeLabel(a.type)}</p>
                    {statusBadge(a.status)}
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Créé le {fmt(a.created_at)}
                    {a.synced_at ? ` · Synchronisé le ${fmt(a.synced_at)}` : ""}
                  </p>
                </div>
                <div className="text-xs text-stone-600 grid grid-cols-2 gap-x-4 gap-y-1">
                  {Object.entries(a.payload)
                    .filter(([, v]) => v !== null && v !== undefined && v !== "")
                    .slice(0, 6)
                    .map(([k, v]) => (
                      <div key={k} className="truncate">
                        <span className="text-stone-500">{k}:</span>{" "}
                        <span className="text-stone-800">{String(v)}</span>
                      </div>
                    ))}
                </div>
                {a.last_error && (
                  <p className="text-[11px] text-red-700 bg-red-50 border border-red-100 rounded px-2 py-1">
                    {a.last_error}
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  {a.status !== "synced" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRetry(a)}
                      disabled={!online}
                      className="min-h-[40px]"
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1" /> Réessayer
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemove(a.id)}
                    className="text-stone-500 hover:text-red-600 hover:bg-red-50 min-h-[40px]"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Supprimer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  );
};

export default PendingSync;
