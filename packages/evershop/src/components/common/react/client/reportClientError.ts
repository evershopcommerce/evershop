/**
 * Client-safe error reporter for the React root callbacks
 * (`onRecoverableError` / `onUncaughtError`) and the root `ErrorBoundary`.
 *
 * The server-side winston logger (`@evershop/evershop/lib/log`) is not present
 * in the browser bundle, so root-level client errors are logged to the console
 * with a stable prefix. This is the single place to later add remote reporting
 * (e.g. a POST to an error endpoint) without touching the mount sites.
 */
export function reportClientError(
  kind: string,
  error: unknown,
  info?: unknown
): void {
  // eslint-disable-next-line no-console
  console.error(`[evershop:${kind}]`, error, info ?? '');
}
