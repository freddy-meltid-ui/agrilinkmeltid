import { useCallback, useEffect, useRef, useState } from "react";
import { listQueue, subscribeQueue, syncAll, type QueuedAction } from "@/lib/offlineQueue";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export const useSyncQueue = () => {
  const online = useOnlineStatus();
  const [items, setItems] = useState<QueuedAction[]>([]);
  const [syncing, setSyncing] = useState(false);
  const lastAutoSync = useRef<number>(0);

  const refresh = useCallback(async () => {
    setItems(await listQueue());
  }, []);

  useEffect(() => {
    refresh();
    return subscribeQueue(refresh);
  }, [refresh]);

  const runSync = useCallback(async () => {
    if (!navigator.onLine) return { synced: 0, failed: 0 };
    setSyncing(true);
    try {
      const r = await syncAll();
      await refresh();
      return r;
    } finally {
      setSyncing(false);
    }
  }, [refresh]);

  // Auto-sync when connection returns or pending items appear
  useEffect(() => {
    const pending = items.filter((i) => i.status !== "synced").length;
    if (online && pending > 0 && !syncing) {
      const now = Date.now();
      if (now - lastAutoSync.current > 3000) {
        lastAutoSync.current = now;
        runSync();
      }
    }
  }, [online, items, syncing, runSync]);

  const pending = items.filter((i) => i.status === "pending" || i.status === "syncing").length;
  const failed = items.filter((i) => i.status === "failed").length;
  const synced = items.filter((i) => i.status === "synced").length;

  return { items, online, syncing, pending, failed, synced, runSync, refresh };
};

export default useSyncQueue;
