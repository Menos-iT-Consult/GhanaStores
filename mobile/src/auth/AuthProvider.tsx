import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import {
  apiErrorMessage,
  clearSession,
  currentRefreshToken,
  loadStoredSession,
  setUnauthorizedHandler,
  storeSession,
} from '@/api/client';
import * as endpoints from '@/api/endpoints';
import { isTwoFactorChallenge, type LoginResult, type Session, type StoreMeta } from '@/types';
import { unregisterDeviceForPush } from '@/services/pushNotifications';
import { clearWidgetSnapshot } from '@/widgets/snapshot';

/**
 * Session + auth state for the seller app. Credentials (access + refresh
 * tokens) live in SecureStore; the axios client reads them. On app boot we
 * restore any stored session; if the refresh token is gone or the server later
 * rejects it, the user is signed out and bounced to the login screen.
 */

interface AuthState {
  status: 'loading' | 'signedOut' | 'signedIn';
  session: Session | null;
  store: StoreMeta | null;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<LoginResult>;
  completeTwoFactor: (challenge: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Keep the session meta (context + SecureStore) in sync after a store rename. */
  updateStoreName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const BOOTSTRAP_KEY = 'didwa.session_meta';

async function saveSessionMeta(session: Session) {
  await SecureStore.setItemAsync(
    BOOTSTRAP_KEY,
    JSON.stringify({ user: session.user, store: session.store }),
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', session: null, store: null });

  const applySession = useCallback(async (session: Session) => {
    await storeSession(session.token, session.refreshToken);
    await saveSessionMeta(session);
    setState({ status: 'signedIn', session, store: session.store });
  }, []);

  const signOut = useCallback(async () => {
    // Detach this device's push token FIRST (while the access token is still
    // valid) so a logged-out phone stops receiving the store's notifications.
    await unregisterDeviceForPush().catch(() => undefined);
    const rt = currentRefreshToken();
    if (rt) await endpoints.logout(rt).catch(() => undefined);
    await clearSession();
    // Drop the cached store numbers so the home-screen widget falls back to
    // its "open the app to sync" empty state instead of stale figures.
    await clearWidgetSnapshot();
    await SecureStore.deleteItemAsync(BOOTSTRAP_KEY).catch(() => undefined);
    setState({ status: 'signedOut', session: null, store: null });
  }, []);

  // Any unrecoverable 401 (refresh failed) signs the user out globally.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setState((prev) => (prev.status === 'signedIn' ? { status: 'signedOut', session: null, store: null } : prev));
    });
    return () => setUnauthorizedHandler(() => undefined);
  }, []);

  // Restore session on boot from SecureStore.
  useEffect(() => {
    (async () => {
      const { accessToken, refreshToken } = await loadStoredSession();
      if (!refreshToken) {
        setState({ status: 'signedOut', session: null, store: null });
        return;
      }
      const metaRaw = await SecureStore.getItemAsync(BOOTSTRAP_KEY);
      let store: StoreMeta | null = null;
      let user = null;
      try {
        const parsed = JSON.parse(metaRaw || '{}');
        store = parsed.store ?? null;
        user = parsed.user ?? null;
      } catch {
        /* ignore */
      }
      if (accessToken && store && user) {
        setState({ status: 'signedIn', session: { token: accessToken, refreshToken } as Session, store });
      } else {
        // Have a refresh token but no access token yet -> let the API client
        // refresh on the first authenticated call. Optimistically show signed-in.
        if (store && user) {
          setState({ status: 'signedIn', session: { token: '', refreshToken } as Session, store });
        } else {
          setState({ status: 'signedOut', session: null, store: null });
        }
      }
    })();
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      const result = await endpoints.login(email, password);
      if (isTwoFactorChallenge(result)) return result;
      await applySession(result as Session);
      return result;
    },
    [applySession],
  );

  const completeTwoFactor = useCallback(
    async (challenge: string, code: string) => {
      const result = await endpoints.loginTwoFactor(challenge, code);
      await applySession(result as Session);
    },
    [applySession],
  );

  // Rename parity with the web dashboard: once PATCH /api/site-settings/name
  // succeeds, mirror the new name into context + SecureStore so the greeting,
  // widget snapshot and next cold boot all agree.
  const updateStoreName = useCallback(async (name: string) => {
    setState((prev) => {
      if (!prev.store || !prev.session) return prev;
      const store = { ...prev.store, name };
      const session = { ...prev.session, store };
      void saveSessionMeta(session);
      return { ...prev, store, session };
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, signIn, completeTwoFactor, signOut, updateStoreName }),
    [state, signIn, completeTwoFactor, signOut, updateStoreName],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
