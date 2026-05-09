import { WifiOff, Wifi } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const OfflineStatusBanner = () => {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 text-sm"
    >
      <WifiOff className="h-4 w-4 flex-shrink-0" />
      <span>
        Mode hors-ligne — vous ne voyez que les régions téléchargées.
      </span>
    </div>
  );
};

export const OnlineDot = () => {
  const online = useOnlineStatus();
  return (
    <span
      title={online ? "En ligne" : "Hors-ligne"}
      className={`inline-flex items-center gap-1 text-[11px] ${
        online ? "text-emerald-700" : "text-amber-700"
      }`}
    >
      {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      {online ? "En ligne" : "Hors-ligne"}
    </span>
  );
};

export default OfflineStatusBanner;
