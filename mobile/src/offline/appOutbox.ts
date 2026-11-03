import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
const OUTBOX_KEY = 'didwa.app-mutations.v1';
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://app.didwaghana.com').replace(/\/+$/, '');

export interface AppMutation {
  id: string;
  method: string;
  url: string;
  data?: unknown;
  headers?: Record<string, string>;
}

async function read(): Promise<AppMutation[]> {
  try {
    const raw = await AsyncStorage.getItem(OUTBOX_KEY);
    const value = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

async function write(items: AppMutation[]) {
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
}

export async function enqueueMutation(item: Omit<AppMutation, 'id'>): Promise<void> {
  const items = await read();
  items.push({
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  });
  await write(items);
}

export async function pendingMutationCount() {
  return (await read()).length;
}

export async function flushAppOutbox(): Promise<number> {
  let flushed = 0;
  const items = await read();
  const accessToken = await SecureStore.getItemAsync('didwa.access_token');
  for (const item of [...items]) {
    try {
      await axios.request({
        baseURL: API_BASE_URL,
        url: item.url,
        method: item.method as any,
        data: item.data,
        headers: {
          ...(item.headers || {}),
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        timeout: 15000,
      });
      const remaining = await read();
      await write(remaining.filter((entry) => entry.id !== item.id));
      flushed += 1;
    } catch (error: any) {
      if (!error?.response || error.response.status >= 500 || error.response.status === 429) break;
      const remaining = await read();
      await write(remaining.filter((entry) => entry.id !== item.id));
    }
  }
  return flushed;
}

let stop: (() => void) | null = null;

export function startAppOfflineSync(): (() => void) {
  if (stop) return stop;
  const unsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      void flushAppOutbox();
    }
  });
  stop = () => {
    unsubscribe();
    stop = null;
  };
  return stop;
}
