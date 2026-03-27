import { useState, useEffect, useCallback } from "react";

const healthSyncApi = typeof window !== "undefined" ? window.healthSyncApi : null;
const syncApi = typeof window !== "undefined" ? window.syncApi : null;

/**
 * Auto-syncs Apple Health data on app open.
 * Checks for a Health export file, and if found + not already synced, processes it.
 */
export default function useHealthSync() {
  const [syncStatus, setSyncStatus] = useState("idle"); // idle | checking | syncing | done | no_file | error
  const [syncResult, setSyncResult] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  // Load last sync info
  useEffect(() => {
    if (syncApi) {
      syncApi.get("apple_health").then(state => {
        if (state) setLastSync(state);
      }).catch(() => {});
    }
  }, []);

  // Auto-check on mount
  useEffect(() => {
    if (!healthSyncApi) return;
    let cancelled = false;

    async function autoCheck() {
      setSyncStatus("checking");
      try {
        const check = await healthSyncApi.autoSync();
        if (cancelled) return;

        if (!check.found) {
          setSyncStatus("no_file");
          return;
        }

        if (check.alreadySynced) {
          setSyncStatus("done");
          setSyncResult({ message: "Already synced", file: check.file });
          return;
        }

        // New export found — sync it (last 30 days)
        setSyncStatus("syncing");
        const result = await healthSyncApi.syncFile(check.file, 30);
        if (cancelled) return;

        if (result?.ok) {
          setSyncStatus("done");
          setSyncResult({ message: "Synced", ...result.summary, file: check.file });
          // Reload sync state
          const state = await syncApi?.get("apple_health");
          if (state) setLastSync(state);
        } else {
          setSyncStatus("error");
        }
      } catch (err) {
        console.error("[useHealthSync] Auto-sync error:", err);
        if (!cancelled) setSyncStatus("error");
      }
    }

    autoCheck();
    return () => { cancelled = true; };
  }, []);

  // Manual trigger
  const manualSync = useCallback(async () => {
    if (!healthSyncApi) return;
    setSyncStatus("checking");
    try {
      const check = await healthSyncApi.autoSync();
      if (!check.found) {
        setSyncStatus("no_file");
        return;
      }
      setSyncStatus("syncing");
      const result = await healthSyncApi.syncFile(check.file, 90); // 90 days for manual
      if (result?.ok) {
        setSyncStatus("done");
        setSyncResult({ message: "Synced", ...result.summary, file: check.file });
        const state = await syncApi?.get("apple_health");
        if (state) setLastSync(state);
      }
    } catch (err) {
      console.error("[useHealthSync] Manual sync error:", err);
      setSyncStatus("error");
    }
  }, []);

  return { syncStatus, syncResult, lastSync, manualSync };
}
