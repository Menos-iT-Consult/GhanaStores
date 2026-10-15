import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as Crypto from 'expo-crypto';
import { AxiosError } from 'axios';
import * as endpoints from '@/api/endpoints';
import type { PosOutboxEntry, PosSalePayload } from '@/types';

/**
 * Offline-first POS outbox.
 *
 * A sale taken on the register is written here BEFORE any network call:
 *   - online  -> flush immediately; the receipt shows the real order number
 *   - offline -> the entry waits; NetInfo reconnect triggers a FIFO flush
 *
 * Every entry carries a UUID `saleId` that is sent as the server's
 * idempotencyKey (-> orders.client_reference), so a replay after a timeout or
 * a reconnect can never record the sale twice or decrement stock twice.
 *
 * Errors are classified:
 *   terminal (400/402/403/404/409) -> status 'failed', kept visible so the
 *     merchant can fix stock / payment and retry or discard
 *   transient (network / 5xx / timeout) -> stays 'pending'
 */
const OUTBOX_KEY = 'didwa.pos.outbox.v1';

type Listener = () => void;
const listeners = new Set<Listener>();
let cache: PosOutboxEntry[] | null = null;
let flushInFlight: Promise<{ synced: number; failed: number }> | null = null;

function notify() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      /* a broken subscriber must not break the queue */
    }
  });
}

/** Subscribe to outbox changes (add / fail / remove / flush). Returns unsubscribe. */
export function subscribeOutbox(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function readOutbox(): Promise<PosOutboxEntry[]> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(OUTBOX_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache;
}

async function writeOutbox(entries: PosOutboxEntry[]): Promise<void> {
  cache = entries;
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(entries)).catch(() => undefined);
  notify();
}

/** Current snapshot of the queue (pending + failed, oldest first). */
export function getOutbox(): Promise<PosOutboxEntry[]> {
  return readOutbox();
}

export function countByStatus(entries: PosOutboxEntry[], status: 'pending' | 'failed'): number {
  return entries.filter((e) => e.status === status).length;
}

/**
 * Queue (or re-queue) a sale. `payload` excludes saleId — this function owns
 * the idempotency key so the same cart can never be sent with two ids.
 */
export async function enqueueSale(payload: Omit<PosSalePayload, 'saleId'>): Promise<PosOutboxEntry> {
  const entry: PosOutboxEntry = {
    saleId: Crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    payload,
    status: 'pending',
  };
  const entries = await readOutbox();
  await writeOutbox([...entries, entry]);
  return entry;
}

/** Move a failed entry back into the pending queue (merchant pressed retry). */
export async function retryEntry(saleId: string): Promise<void> {
  const entries = await readOutbox();
  await writeOutbox(
    entries.map((e) => (e.saleId === saleId ? { ...e, status: 'pending' as const, error: undefined } : e)),
  );
}

/** Drop an entry entirely (merchant pressed discard). */
export async function discardEntry(saleId: string): Promise<void> {
  const entries = await readOutbox();
  await writeOutbox(entries.filter((e) => e.saleId !== saleId));
}

/** Terminal = the server permanently rejected the sale; retrying is pointless. */
function isTerminalError(err: unknown): boolean {
  const status = (err as AxiosError)?.response?.status;
  return status === 400 || status === 402 || status === 403 || status === 404 || status === 409;
}

function errorMessage(err: unknown): string {
  const data = (err as AxiosError<{ error?: string }>)?.response?.data;
  return data?.error || (err as Error)?.message || 'Could not sync this sale.';
}

/**
 * Flush pending entries FIFO. Safe to call concurrently — overlapping calls
 * share one in-flight flush. Returns how many entries synced vs failed.
 */
export function flushOutbox(): Promise<{ synced: number; failed: number }> {
  if (flushInFlight) return flushInFlight;
  flushInFlight = (async () => {
    let synced = 0;
    let failed = 0;
    const entries = await readOutbox();
    for (const entry of entries) {
      if (entry.status !== 'pending') continue;
      try {
        await endpoints.createPosSale({ saleId: entry.saleId, ...entry.payload });
        synced += 1;
        await removeEntry(entry.saleId);
      } catch (err) {
        if (isTerminalError(err)) {
          failed += 1;
          await markFailed(entry.saleId, errorMessage(err));
        }
        // Transient errors leave the entry pending for the next flush.
      }
    }
    return { synced, failed };
  })().finally(() => {
    flushInFlight = null;
  });
  return flushInFlight;
}

async function removeEntry(saleId: string): Promise<void> {
  const entries = await readOutbox();
  await writeOutbox(entries.filter((e) => e.saleId !== saleId));
}

async function markFailed(saleId: string, error: string): Promise<void> {
  const entries = await readOutbox();
  await writeOutbox(
    entries.map((e) => (e.saleId === saleId ? { ...e, status: 'failed' as const, error } : e)),
  );
}

/** Clear everything (used on sign-out so another seller never sees the queue). */
export async function clearOutbox(): Promise<void> {
  await writeOutbox([]);
}

let netStop: (() => void) | null = null;

/**
 * Start the global connectivity listener: the moment the device comes back
 * online, pending sales flush. Idempotent — calling twice keeps one listener.
 */
export function startOutboxAutoSync(): () => void {
  if (netStop) return netStop;
  const unsub = NetInfo.addEventListener((state) => {
    const reachable = state.isConnected && state.isInternetReachable !== false;
    if (reachable) flushOutbox().catch(() => undefined);
  });
  netStop = () => {
    unsub();
    netStop = null;
  };
  return netStop;
}

