import * as React from 'react';

/**
 * Loading state for a button whose click waits on the server.
 *
 * On a slow network a button that looks idle after a click invites a second
 * click: a second request, a duplicate record. `useAsyncAction` wraps the
 * click handler: the button shows a spinner (pass `running` to `isLoading`)
 * until the handler's promise settles, and further clicks are ignored.
 *
 * When the handler leaves the page (`location.reload()`, `location.href =
 * …`), the spinner stays until the next page replaces this one; that can take
 * seconds too. A page restored from the back/forward cache starts idle again.
 * Do not use it for a click that downloads a file through `location.href`:
 * the page does not change, so the spinner would never stop.
 */

let leaving = false;
let listening = false;

function listenForLeave() {
  if (listening || typeof window === 'undefined') {
    return;
  }
  listening = true;
  // Browsers fire `beforeunload` synchronously inside `location.reload()` and
  // `location.href = …`, so a handler that has just started a navigation sees
  // the flag when its promise settles. It only has to hold for that moment:
  // reset it in the next task, so a cancelled navigation (a "leave the page?"
  // prompt) does not leave the next button spinning.
  window.addEventListener('beforeunload', () => {
    leaving = true;
    setTimeout(() => {
      leaving = false;
    }, 0);
  });
}

/**
 * True while the page is starting to leave (see above). Call it right after
 * awaiting the action that may have navigated.
 */
export function isPageLeaving(): boolean {
  listenForLeave();
  return leaving;
}

/**
 * Runs `callback` when the browser shows this page again from the
 * back/forward cache (the Back button after a navigation). Returns the
 * unsubscribe function, ready for `useEffect`.
 */
export function onPageRestore(callback: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }
  const listener = (event: PageTransitionEvent) => {
    if (event.persisted) {
      callback();
    }
  };
  window.addEventListener('pageshow', listener);
  return () => window.removeEventListener('pageshow', listener);
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PromiseLike<unknown>).then === 'function'
  );
}

/**
 * ```tsx
 * const [remove, removing] = useAsyncAction(async () => {
 *   await fetch(deleteApi, { method: 'DELETE' });
 *   window.location.reload();
 * });
 * <Button onClick={remove} isLoading={removing}>{_('Delete')}</Button>
 * ```
 *
 * The handler may also return nothing (a plain click handler): then no
 * spinner is shown. `run` never rejects, because a click has nobody to hand
 * an error to: a failure ends the spinner and is logged to the console. Tell
 * the user in the action itself (a toast), as before.
 */
export function useAsyncAction<Args extends unknown[]>(
  action: (...args: Args) => unknown
): [run: (...args: Args) => Promise<void>, running: boolean] {
  const [running, setRunning] = React.useState(false);
  const runningRef = React.useRef(false);
  // The latest action, so `run` keeps one identity across renders.
  const actionRef = React.useRef(action);
  actionRef.current = action;

  React.useEffect(() => {
    listenForLeave();
    return onPageRestore(() => {
      runningRef.current = false;
      setRunning(false);
    });
  }, []);

  const run = React.useCallback(async (...args: Args) => {
    if (runningRef.current) {
      return;
    }
    let result: unknown;
    try {
      result = actionRef.current(...args);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      return;
    }
    if (!isThenable(result)) {
      return;
    }
    runningRef.current = true;
    setRunning(true);
    try {
      await result;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    } finally {
      if (!isPageLeaving()) {
        runningRef.current = false;
        setRunning(false);
      }
    }
  }, []);

  return [run, running];
}
