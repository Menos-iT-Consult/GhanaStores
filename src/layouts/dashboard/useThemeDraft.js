/**
 * layouts/dashboard/useThemeDraft.js
 * The working-copy theme config and every side effect that depends on it.
 *
 * The seller edits a DRAFT, not the live theme. The draft is mirrored to
 * localStorage so the preview canvas can hydrate instantly, and broadcast on
 * every change so the preview re-renders without prop drilling through the
 * hash router. Nothing here touches the server until Publish.
 */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api.js';
import {
  DEFAULT_CUSTOM_THEME_CONFIG, normalizeCustomThemeConfig, seedConfigFromTheme,
} from '../../theme/config.js';

/** localStorage key holding the in-progress theme draft. */
export const THEME_DRAFT_KEY = 'gs_custom_theme';

/**
 * Read the cached draft, tolerating a corrupt or absent entry.
 *
 * @returns {object} A normalised theme config.
 */
function readCachedConfig() {
  try {
    const raw = localStorage.getItem(THEME_DRAFT_KEY);
    return raw ? normalizeCustomThemeConfig(JSON.parse(raw)) : DEFAULT_CUSTOM_THEME_CONFIG;
  } catch {
    return DEFAULT_CUSTOM_THEME_CONFIG;
  }
}

/**
 * Owns the theme draft, its persistence, its live broadcast, first-run seeding
 * from the published theme, and publishing.
 *
 * @returns {object} The draft, a setter, and the publish status handlers.
 */
export function useThemeDraft() {
  const [customTheme, setCustomTheme] = useState(readCachedConfig);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  /* Persist the working copy so the preview page can hydrate instantly. */
  useEffect(() => {
    localStorage.setItem(THEME_DRAFT_KEY, JSON.stringify(customTheme));
  }, [customTheme]);

  /* Broadcast every edit so the live storefront preview canvas re-renders in
     real time without prop drilling through the hash router. */
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('gs:theme-preview', { detail: customTheme }));
  }, [customTheme]);

  /* First visit with an empty cache: seed from the currently published theme. */
  useEffect(() => {
    if (localStorage.getItem(THEME_DRAFT_KEY)) return undefined;
    let alive = true;
    api.get('/api/store/theme')
      .then((res) => {
        if (!alive || !res?.theme?.config) return;
        const seeded = normalizeCustomThemeConfig(seedConfigFromTheme(res.theme.config));
        setCustomTheme(seeded);
        localStorage.setItem(THEME_DRAFT_KEY, JSON.stringify(seeded));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  /** Publish the draft to the store. Resets the "Saved" badge after a moment. */
  const onPublish = useCallback(async () => {
    setIsPublishing(true);
    setPublishSuccess(false);
    try {
      await api.put('/api/store/theme', { custom_theme_config: customTheme });
      setPublishSuccess(true);
      setTimeout(() => setPublishSuccess(false), 2000);
    } catch (e) {
      console.error('Failed to publish theme:', e);
    } finally {
      setIsPublishing(false);
    }
  }, [customTheme]);

  /** Restore every token to the schema defaults. */
  const onResetDefaults = useCallback(() => {
    setCustomTheme(normalizeCustomThemeConfig(null));
  }, []);

  /** Replace the draft wholesale, e.g. when opening the active theme. */
  const seedFromThemeConfig = useCallback((config) => {
    const seeded = normalizeCustomThemeConfig(config);
    setCustomTheme(seeded);
    localStorage.setItem(THEME_DRAFT_KEY, JSON.stringify(seeded));
  }, []);

  return {
    customTheme,
    setCustomTheme,
    isPublishing,
    publishSuccess,
    onPublish,
    onResetDefaults,
    seedFromThemeConfig,
  };
}