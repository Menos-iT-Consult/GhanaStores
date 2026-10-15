import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import {
  countByStatus,
  flushOutbox,
  getOutbox,
  startOutboxAutoSync,
  subscribeOutbox,
} from './posOutbox';
import type { PosOutboxEntry } from '@/types';

export interface PosSyncStatus {
  /** Device currently has a usable connection (null until NetInfo answers). */
  online: boolean | null;
  entries: PosOutboxEntry[];
  pending: number;
  failed: number;
  /** Force a flush now (pull-to-refresh / retry button). */
  flush: () => Promise<{ synced: number; failed: number }>;
}

/**
 * Live view of connectivity + the offline sale queue for the POS header and
 * the dashboard's ops alerts. Starts the global auto-sync listener on mount.
 */
export function usePosSync(): PosSyncStatus {
  const [online, setOnline] = useState<boolean | null>(null);
  const [entries, setEntries] = useState<PosOutboxEntry[]>([]);

  useEffect(() => {
    // Global singleton: intentionally NOT stopped on unmount — every screen
    // that mounts this hook keeps sharing one NetInfo flush listener.
    startOutboxAutoSync();
    const unsubNet = NetInfo.addEventListener((state) => {
      setOnline(Boolean(state.isConnected) && state.isInternetReachable !== false);
    });
    const unsubOutbox = subscribeOutbox(() => {
      getOutbox().then(setEntries).catch(() => undefined);
    });
    getOutbox().then(setEntries).catch(() => undefined);
    return () => {
      unsubNet();
      unsubOutbox();
    };
  }, []);

  return {
    online,
    entries,
    pending: countByStatus(entries, 'pending'),
    failed: countByStatus(entries, 'failed'),
    flush: flushOutbox,
  };
}
