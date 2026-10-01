/**
 * layouts/dashboard/useUnsavedChanges.js
 * Warns before unsaved theme edits are lost.
 *
 * Covers both ways a seller can lose work:
 *   1. In-app navigation, via a guard installed in the shared router. The router
 *      uses pushState/popstate (no hash), so a `hashchange` listener would never
 *      fire - the guard is the only reliable interception point.
 *   2. Refreshing or closing the tab, via `beforeunload`.
 *
 * Browsers render their OWN wording for case 2 and it cannot be customised; this
 * supplies the in-app dialog for case 1, where we control the copy and can offer
 * a real Save / Discard / Stay choice.
 *
 * @param {boolean} isDirty True when there are edits that are not published.
 * @param {{onSave?:Function, onDiscard?:Function}} handlers Actions offered in
 *   the in-app dialog. Either may be omitted; its button is then hidden.
 * @returns {{pending:boolean, leaving:boolean, requestLeave:Function,
 *   cancelLeave:Function, resolveLeave:Function}} Dialog state and handlers.
 */
import { useCallback, useEffect, useState } from 'react';
import { navigate as navigateRef, setNavigationGuard } from '../../router.js';

export function useUnsavedChanges(isDirty, { onSave, onDiscard } = {}) {
  const [pending, setPending] = useState(false);
  /* True while a publish triggered from the dialog is still in flight, so the
     dialog cannot be dismissed and navigation allowed mid-request. */
  const [leaving, setLeaving] = useState(false);
  /* Where the seller was trying to go. Replayed after Save/Discard. */
  const [target, setTarget] = useState(null);

  /* Browser-level guard: refresh, close, or back out of the app. */
  useEffect(() => {
    if (!isDirty) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      /* Legacy browsers need returnValue set for the prompt to appear at all. */
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  /* In-app guard: cancel the navigation and ask instead. Only installed while
     there is something to lose, so normal navigation stays untouched. */
  useEffect(() => {
    if (!isDirty) return undefined;
    return setNavigationGuard((next) => {
      setTarget(next);
      setPending(true);
      return false; // cancel; the dialog decides what happens next
    });
  }, [isDirty]);

  /** Stay on the page and keep editing. */
  const cancelLeave = useCallback(() => {
    setPending(false);
    setTarget(null);
  }, []);

  /** Resolve the dialog: publish (save), discard, or do nothing (stay). */
  const resolveLeave = useCallback(
    async (action) => {
      if (action === 'stay') return cancelLeave();
      if (action === 'discard') {
        await onDiscard?.();
        const next = target;
        setPending(false);
        setTarget(null);
        if (next) replayNavigation(next);
        return;
      }
      if (action === 'save') {
        setLeaving(true);
        try {
          await onSave?.();
        } catch {
          /* Publishing failed; stay put so the seller keeps their edits. */
          setLeaving(false);
          setPending(false);
          return;
        }
        setLeaving(false);
        const next = target;
        setPending(false);
        setTarget(null);
        if (next) replayNavigation(next);
      }
    },
    [cancelLeave, onDiscard, onSave, target],
  );

  return { pending, leaving, requestLeave: setPending, cancelLeave, resolveLeave };
}

/**
 * Perform a navigation that the guard just cancelled.
 *
 * The guard is still installed at this point (isDirty has not changed yet), so
 * this clears it for one call and restores it immediately afterwards -
 * otherwise the replay would cancel itself and the seller would be stuck.
 */
function replayNavigation(path) {
  /* setNavigationGuard returns a cleanup that only clears the guard it
     installed, so replacing it here cannot tear down a newer guard. */
  const restore = setNavigationGuard(() => true);
  try {
    navigateRef(path);
  } finally {
    restore();
  }
}
