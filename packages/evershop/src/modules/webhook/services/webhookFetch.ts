import { Agent, fetch as undiciFetch } from 'undici';
import { createGuardedAgent } from '../../../lib/ssrf/guardedAgent.js';
import {
  assertLiteralAllowed,
  BLOCKED_MESSAGE
} from '../../../lib/ssrf/guardedLookup.js';
import { REQUEST_TIMEOUT_MS } from './constants.js';
import { isPrivateNetworkAllowed } from './ipBlockList.js';

export type WebhookFetchResult = {
  /** True for a 2xx response. */
  ok: boolean;
  /** The HTTP status, or null when no response was received. */
  statusCode: number | null;
  /** A short description of a network failure; null for any HTTP response. */
  error: string | null;
};

// The connect-time SSRF guard is shared (`lib/ssrf`); this decides whether
// private addresses are allowed from the webhook configuration.
let agent: Agent | null = null;
function getAgent(): Agent {
  if (!agent) {
    agent = createGuardedAgent({ allowPrivate: isPrivateNetworkAllowed });
  }
  return agent;
}

/** Short, admin-readable reason for a network failure. */
export function describeFetchError(e: unknown): string {
  const err = e as any;
  if (err?.name === 'AbortError' || err?.cause?.name === 'AbortError') {
    return `Timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds`;
  }
  const code = err?.cause?.code ?? err?.code;
  if (code === 'EBLOCKED') {
    return BLOCKED_MESSAGE;
  }
  if (typeof code === 'string') {
    return code;
  }
  return String(err?.cause?.message ?? err?.message ?? 'Request failed').slice(
    0,
    200
  );
}

/**
 * POST a webhook. Never throws: any failure is returned as a result.
 *
 * Success is a 2xx status within `REQUEST_TIMEOUT_MS`. Redirects are not
 * followed (a 3xx is a failure), and the response body is never read: it is
 * cancelled as soon as the status is known so the connection is released.
 */
export async function postWebhook(
  url: string,
  headers: Record<string, string>,
  body: string
): Promise<WebhookFetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const parsed = new URL(url);
    assertLiteralAllowed(parsed.hostname, isPrivateNetworkAllowed());
    const response = await undiciFetch(parsed, {
      method: 'POST',
      headers,
      body,
      redirect: 'manual',
      signal: controller.signal,
      dispatcher: getAgent()
    });
    const { status } = response;
    try {
      await response.body?.cancel();
    } catch {
      // The status is all we need; a failed cancel changes nothing.
    }
    return { ok: status >= 200 && status < 300, statusCode: status, error: null };
  } catch (e) {
    return { ok: false, statusCode: null, error: describeFetchError(e) };
  } finally {
    clearTimeout(timer);
  }
}
