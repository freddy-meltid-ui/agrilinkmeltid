import { useEffect } from "react";
import { useSyncQueue } from "@/hooks/useSyncQueue";

/**
 * Mounts the queue hook globally so pending actions auto-sync as soon as
 * the user comes back online — even if no Atlas page is open.
 */
const SyncQueueProvider = ({ children }: { children: React.ReactNode }) => {
  const { online, pending, failed, runSync } = useSyncQueue();

  useEffect(() => {
    if (online && pending + failed > 0) {
      runSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  return <>{children}</>;
};

export default SyncQueueProvider;
