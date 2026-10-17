import dns from 'dns';
import { isIP } from 'net';
import { isBlockedAddress } from './ipBlockList.js';

export const BLOCKED_MESSAGE =
  'Blocked: the URL points to a private or reserved address';

/** The error of a connection refused by the guard. `code` is `EBLOCKED`. */
export class BlockedAddressError extends Error {
  code = 'EBLOCKED';

  constructor() {
    super(BLOCKED_MESSAGE);
  }
}

export type LookupFunction = (
  hostname: string,
  options: dns.LookupOptions,
  callback: (
    err: NodeJS.ErrnoException | null,
    addresses: dns.LookupAddress[]
  ) => void
) => void;

export interface GuardOptions {
  /**
   * Whether private addresses may be contacted (local development, a test).
   * Called on every lookup, so it can follow configuration.
   */
  allowPrivate: () => boolean;
  /** The DNS lookup. A test passes a fake; the default is `dns.lookup`. */
  lookup?: LookupFunction;
}

/**
 * Connect-time SSRF guard. The hostname is resolved here and the connection is
 * refused if ANY resolved address is blocked. Checking the address we actually
 * connect to (not just the hostname when the URL was saved) is what defeats DNS
 * rebinding and a hostname that points at an internal address. Passed to an
 * undici `Agent` as `connect.lookup`.
 */
export function createGuardedLookup(
  options: GuardOptions
): (hostname: string, lookupOptions: any, callback: any) => void {
  const resolve: LookupFunction =
    options.lookup ?? (dns.lookup as unknown as LookupFunction);
  return (hostname, lookupOptions, callback) => {
    const cb = typeof lookupOptions === 'function' ? lookupOptions : callback;
    let opts: Record<string, any> = {};
    if (typeof lookupOptions === 'number') {
      opts = { family: lookupOptions };
    } else if (lookupOptions && typeof lookupOptions === 'object') {
      opts = lookupOptions;
    }
    resolve(hostname, { ...opts, all: true }, (err, addresses) => {
      if (err) {
        cb(err);
        return;
      }
      if (
        !options.allowPrivate() &&
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
  };
}

/**
 * An IP literal in the URL (`https://169.254.169.254/`) is never resolved, so
 * the guarded lookup does not run for it. Check it here instead.
 */
export function assertLiteralAllowed(
  hostname: string,
  allowPrivate: boolean
): void {
  const host = hostname.replace(/^\[|\]$/g, '');
  if (isIP(host) && !allowPrivate && isBlockedAddress(host)) {
    throw new BlockedAddressError();
  }
}
