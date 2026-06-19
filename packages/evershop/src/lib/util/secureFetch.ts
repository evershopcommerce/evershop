import { Agent, buildConnector, fetch as undiciFetch } from 'undici';

const REQUEST_TIMEOUT_MS = 15000;

/**
 * Hosts the image proxy (`/images?src=…`) is allowed to fetch from, read from
 * the `IMAGE_ALLOWED_HOSTS` environment variable (comma-separated). This is a
 * strict allowlist: any host not listed — public or private — is refused. It
 * both blocks SSRF (loopback, link-local metadata, private ranges, …) and stops
 * the endpoint from being abused as a free image-optimization proxy for
 * arbitrary third-party images. When unset/empty, no external host is allowed
 * (only local media/public/theme images are processed).
 */
export function getAllowedImageHosts(): string[] {
  return (process.env.IMAGE_ALLOWED_HOSTS || '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowedHost(host: string | undefined | null): boolean {
  if (!host) {
    return false;
  }
  return getAllowedImageHosts().includes(host.toLowerCase());
}

const baseConnector = buildConnector({});

type Connector = ReturnType<typeof buildConnector>;
type ConnectorOptions = Parameters<Connector>[0];
type ConnectorCallback = Parameters<Connector>[1];

/**
 * Refuse to open a connection to any host that is not on the allowlist. Because
 * this runs for every connection — including each redirect hop — a redirect
 * from an allowed host to a non-allowed one (e.g. an open redirect pointed at an
 * internal address) is still blocked.
 */
const guardedConnector = (
  options: ConnectorOptions,
  callback: ConnectorCallback
): void => {
  if (!isAllowedHost(options.hostname)) {
    callback(
      new Error(
        `Blocked image fetch from non-allowlisted host: ${options.hostname}`
      ),
      null
    );
    return;
  }
  baseConnector(options, callback);
};

const guardedAgent = new Agent({ connect: guardedConnector });

/**
 * Parse and validate an untrusted image URL: http/https only, and the host must
 * be on the `IMAGE_ALLOWED_HOSTS` allowlist. Returns the parsed URL.
 */
export function assertAllowedUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http and https URLs are allowed');
  }
  const host = url.hostname.replace(/^\[/, '').replace(/\]$/, '');
  if (!isAllowedHost(host)) {
    throw new Error(
      `Image host "${host}" is not allowed. Add it to the IMAGE_ALLOWED_HOSTS environment variable.`
    );
  }
  return url;
}

/**
 * `fetch` for untrusted, user-supplied image URLs. Only hosts on the
 * `IMAGE_ALLOWED_HOSTS` allowlist may be reached (every redirect hop included),
 * restricted to http(s), with a request timeout to guard against hanging hosts.
 */
export async function secureFetch(
  rawUrl: string,
  init: Parameters<typeof undiciFetch>[1] = {}
): Promise<Awaited<ReturnType<typeof undiciFetch>>> {
  const url = assertAllowedUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await undiciFetch(url, {
      ...init,
      signal: controller.signal,
      dispatcher: guardedAgent
    });
  } finally {
    clearTimeout(timer);
  }
}
