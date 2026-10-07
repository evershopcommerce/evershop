import { isIP } from 'net';
import { MAX_URL_LENGTH } from './constants.js';
import { WebhookValidationError } from './errors.js';
import { isBlockedAddress, isPrivateNetworkAllowed } from './ipBlockList.js';

/**
 * Validate a webhook URL at save time and return its normalized form (the same
 * form the request will use, so validation and fetch can't disagree).
 *
 * This is the friendly early check. The real SSRF guard is the connect-time
 * address check in `webhookFetch`, which also defeats DNS tricks.
 *
 * Default: `https:` only, no private addresses. With
 * `system.webhook.allowPrivateNetworks`, `http:` and private addresses are OK.
 */
export function assertWebhookUrl(
  raw: unknown,
  allowPrivate: boolean = isPrivateNetworkAllowed()
): string {
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new WebhookValidationError('Webhook URL is required');
  }
  const value = raw.trim();
  if (value.length > MAX_URL_LENGTH) {
    throw new WebhookValidationError(
      `Webhook URL must be at most ${MAX_URL_LENGTH} characters`
    );
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new WebhookValidationError('Webhook URL is not a valid URL');
  }

  const protocols = allowPrivate ? ['https:', 'http:'] : ['https:'];
  if (!protocols.includes(url.protocol)) {
    throw new WebhookValidationError(
      allowPrivate
        ? 'Webhook URL must start with http:// or https://'
        : 'Webhook URL must start with https://'
    );
  }
  if (url.username || url.password) {
    throw new WebhookValidationError(
      'Webhook URL must not contain a username or password'
    );
  }
  if (!url.hostname) {
    throw new WebhookValidationError('Webhook URL must include a host');
  }

  if (!allowPrivate) {
    const host = url.hostname.replace(/^\[|\]$/g, '');
    const isLocalName = host === 'localhost' || host.endsWith('.localhost');
    if (isLocalName || (isIP(host) && isBlockedAddress(host))) {
      throw new WebhookValidationError(
        'Webhook URL points to a private or reserved address'
      );
    }
  }
  return url.toString();
}
