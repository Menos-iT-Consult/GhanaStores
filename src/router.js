/** History API navigation shared by the public site, seller PWA, and admin. */
import { useEffect, useState } from 'react';

/**
 * Optional guard consulted before every in-app navigation.
 *
 * The customizer registers one so a seller with unsaved theme edits is asked
 * before navigating away. A guard returning `false` CANCELS the navigation and
 * is expected to surface its own UI; returning anything else allows it.
 * @type {null | (() => boolean | Promise<boolean>)}
 */
let navigationGuard = null;

/**
 * Register a navigation guard, returning a function that removes it.
 *
 * Guard registration is last-wins and there is only ever one consumer (the
 * customizer), so a single slot is enough - but the returned cleanup matters:
 * without it a stale guard would keep intercepting navigation after the
 * customizer unmounts.
 *
 * @param {null | (() => boolean | Promise<boolean>)} guard The guard to install.
 * @returns {Function} Cleanup that removes this exact guard.
 */
export function setNavigationGuard(guard) {
  navigationGuard = guard;
  return () => {
    if (navigationGuard === guard) navigationGuard = null;
  };
}

export function navigate(path, { replace = false } = {}) {
  const next = path.startsWith('/') ? path : `/${path}`;
  if (window.location.pathname + window.location.search === next) return;
  /* Navigation is a side effect, so it is not performed from a reducer or
     during render; the guard may open a dialog, which is fine here. */
  if (navigationGuard && navigationGuard(next) === false) return;
  window.history[replace ? 'replaceState' : 'pushState']({}, '', next);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function usePathname() {
  const read = () => {
    const path = window.location.pathname || '/';
    if (path === '/' || path === '') return '/';
    return path.replace(/\/+$/, '') || '/';
  };
  const [pathname, setPathname] = useState(read);
  useEffect(() => {
    const onChange = () => setPathname(read());
    window.addEventListener('popstate', onChange);
    return () => window.removeEventListener('popstate', onChange);
  }, []);
  return pathname;
}
