/**
 * layouts/dashboard/useThemeDraft.js
 * The working-copy theme config and every side effect that depends on it.
 *
 * The seller edits a DRAFT, not the live theme. The draft is mirrored to
 * localStorage so the preview canvas can hydrate instantly, and broadcast on
 * every change so the preview re-renders without prop drilling through the
 * hash router. Nothing here touches the server until Publish.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import {
  DEFAULT_CUSTOM_THEME_CONFIG, normalizeCustomThemeConfig, seedConfigFromTheme,
} from '../../theme/config.js';

/**
 * Reduce a full token draft to ONLY the tokens the seller actually changed.
 *
 * THE BUG THIS FIXES: publish used to send the entire normalised draft as
 * `custom_theme_config`. `normalizeCustomThemeConfig` fills every token from the
 * schema defaults, so "publish without editing" still shipped ~60 fully
 * populated default tokens. The storefront layers template -> overrides ->
 * store identity, so those defaults OUTRANKED the active template's own palette,
 * fonts and layout: a seller who published an untouched theme got the generic
 * schema look instead of the theme they had just applied.
 *
 * With an untouched draft this now yields `{}`, which leaves the template's own
 * values in charge - publishing becomes a no-op on the storefront, exactly as
 * "I did not customise anything" should behave.
 *
 * @param {object} draft The full working-copy token config.
 * @param {object} baseline The tokens as they were when editing began.
 * @returns {object} Only the tokens that differ from the baseline.
 */
export function diffThemeTokens(draft, baseline) {
  if (draft == null || typeof draft !== 'object') return {};
  if (baseline == null || typeof baseline !== 'object') return { ...draft };
  const out = {};
  for (const key of Object.keys(draft)) {
    const next = draft[key];
    const prev = baseline[key];
    if (Array.isArray(next) || typeof next !== 'object' || next === null) {
      // Scalars and arrays are whole values; compare them directly.
      if (JSON.stringify(next) !== JSON.stringify(prev)) out[key] = next;
      continue;
    }
    const nested = diffThemeTokens(next, prev || {});
    if (Object.keys(nested).length > 0) out[key] = nested;
  }
  return out;
}

/** localStorage key holding the in-progress theme draft. */
export const THEME_DRAFT_KEY = 'gs_custom_theme';

/**
 * Key holding the baseline the draft is diffed against when publishing. Written
 * when the customizer opens, so "did the seller change anything?" has a stable
 * answer across reloads.
 */
export const THEME_BASELINE_KEY = 'gs_custom_theme_baseline';

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
 * Read the publish baseline: the tokens as they were when editing began.
 *
 * @returns {object|null} The baseline, or null when none was recorded.
 */
function readBaseline() {
  try {
    const raw = localStorage.getItem(THEME_BASELINE_KEY);
    return raw ? normalizeCustomThemeConfig(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}


/**
 * Owns the theme draft, its persistence, its live broadcast, first-run seeding
 * from the published theme, dirty tracking and publishing.
 *
 * @returns {object} The draft, a setter, publish handlers and `isDirty`.
 */
export function useThemeDraft() {
  const [customTheme, setCustomTheme] = useState(readCachedConfig);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  /* The baseline the draft is compared against to decide "unsaved changes".
     Held in state as well as localStorage because the unsaved-changes guard
     needs it during render, not one effect later. */
  const [baseline, setBaseline] = useState(readBaseline);

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
        /* The seeded values ARE the baseline: they are what is already live, so
           a seller who opens the customizer and publishes immediately must not
           be recorded as having customised anything. */
        setBaseline(seeded);
        localStorage.setItem(THEME_DRAFT_KEY, JSON.stringify(seeded));
        localStorage.setItem(THEME_BASELINE_KEY, JSON.stringify(seeded));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  /* True when the draft differs from what was last published. */
  const isDirty = useMemo(
    () => JSON.stringify(diffThemeTokens(customTheme, baseline)) !== '{}',
    [customTheme, baseline],
  );

  /**
   * Publish the draft to the store. Only the seller's actual CHANGES are sent:
   * an untouched draft publishes an empty override set, which leaves the active
   * template's own design in charge instead of replacing it with schema
   * defaults. Resets the "Saved" badge after a moment.
   */
  const onPublish = useCallback(async () => {
    setIsPublishing(true);
    setPublishSuccess(false);
    try {
      const overrides = diffThemeTokens(customTheme, baseline);
      await api.put('/api/store/theme', { custom_theme_config: overrides });
      /* The published state becomes the new baseline, so isDirty clears and the
         unsaved-changes guard stops warning about edits that are now saved. */
      setBaseline(customTheme);
      localStorage.setItem(THEME_BASELINE_KEY, JSON.stringify(customTheme));
      setPublishSuccess(true);
      setTimeout(() => setPublishSuccess(false), 2000);
    } catch (e) {
      console.error('Failed to publish theme:', e);
    } finally {
      setIsPublishing(false);
    }
  }, [customTheme, baseline]);

  /** Restore every token to the schema defaults. */
  const onResetDefaults = useCallback(() => {
    setCustomTheme(normalizeCustomThemeConfig(null));
  }, []);

  /** Replace the draft wholesale, e.g. when opening the active theme. */
  const seedFromThemeConfig = useCallback((config) => {
    const seeded = normalizeCustomThemeConfig(config);
    setCustomTheme(seeded);
    /* Opening the ACTIVE theme is not an edit: the baseline moves with it so the
       unsaved-changes guard stays quiet until the seller changes something. */
    setBaseline(seeded);
    localStorage.setItem(THEME_DRAFT_KEY, JSON.stringify(seeded));
    localStorage.setItem(THEME_BASELINE_KEY, JSON.stringify(seeded));
  }, []);

  /** Throw away unsaved edits and return to the last published state. */
  const onDiscardChanges = useCallback(() => {
    setCustomTheme(baseline || DEFAULT_CUSTOM_THEME_CONFIG);
  }, [baseline]);

  return {
    customTheme,
    setCustomTheme,
    isPublishing,
    publishSuccess,
    isDirty,
    onPublish,
    onResetDefaults,
    onDiscardChanges,
    seedFromThemeConfig,
  };
}