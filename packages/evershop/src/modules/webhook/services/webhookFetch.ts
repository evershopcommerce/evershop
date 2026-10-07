import dns from 'dns';
import { isIP } from 'net';
import { Agent, fetch as undiciFetch } from 'undici';
import { REQUEST_TIMEOUT_MS } from './constants.js';
import { isBlockedAddress, isPrivateNetworkAllowed } from './ipBlockList.js';

export type WebhookFetchResult = {
  /** True for a 2xx response. */
  ok: boolean;
  /** The HTTP status, or null when no response was received. */
  statusCode: number | null;
  /** A short description of a network failure; null for any HTTP response. */
  error: string | null;
};

const BLOCKED_MESSAGE =
  'Blocked: the URL points to a private or reserved address';

class BlockedAddressError extends Error {
  code = 'EBLOCKED';

  constructor() {
    super(BLOCKED_MESSAGE);
  }
}

/**
 * Connect-time SSRF guard. The hostname is resolved here and the connection is
 * refused if ANY resolved address is blocked. Checking the address we actually
 * connect to (not just the hostname when the admin saved it) is what defeats
 * DNS rebinding and a hostname that points at an internal address.
 */
function guardedLookup(hostname: string, options: any, callback: any): void {
  const cb = typeof options === 'function' ? options : callback;
  let opts: Record<string, any> = {};
  if (typeof options === 'number') {
    opts = { family: options };
  } else if (options && typeof options === 'object') {
    opts = options;
  }
  dns.lookup(hostname, { ...opts, all: true }, (err, addresses) => {
    if (err) {
      cb(err);
      return;
    }
    if (
      !isPrivateNetworkAllowed() &&
      addresses.some((a) => isBlockedAddress(a.address))
    ) {
      cb(new BlockedAddressError());
      return;
    }
    if (opts.all) {
      cb(null, addresses);
    } else {
      cb(null, addresses[0].address, addresses[0].family);
    }
  });
}

let agent: Agent | null = null;
function getAgent(): Agent {
  if (!agent) {
    agent = new Agent({ connect: { lookup: guardedLookup } as any });
  }
  return agent;
}

/**
 * An IP literal in the URL (`https://169.254.169.254/`) is never resolved, so
 * `guardedLookup` does not run for it. Check it here instead.
 */
function assertLiteralAllowed(hostname: string): void {
  const host = hostname.replace(/^\[|\]$/g, '');
  if (isIP(host) && !isPrivateNetworkAllowed() && isBlockedAddress(host)) {
    throw new BlockedAddressError();
  }
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
    assertLiteralAllowed(parsed.hostname);
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
