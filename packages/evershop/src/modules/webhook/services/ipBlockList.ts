import { BlockList, isIPv4, isIPv6 } from 'net';
import { getConfig } from '../../../lib/util/getConfig.js';

/**
 * Addresses a webhook must never reach (SSRF protection): loopback, private
 * ranges, link-local (including the 169.254.169.254 cloud metadata address),
 * and other reserved space.
 */
const blocked = new BlockList();

const IPV4_RANGES: Array<[string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4]
];

const IPV6_RANGES: Array<[string, number]> = [
  // `::` and `::1` plus the deprecated IPv4-compatible space.
  ['::', 96],
  ['fe80::', 10],
  ['fc00::', 7],
  ['ff00::', 8],
  ['2001:db8::', 32]
];

IPV4_RANGES.forEach(([net, prefix]) => blocked.addSubnet(net, prefix, 'ipv4'));
IPV6_RANGES.forEach(([net, prefix]) => blocked.addSubnet(net, prefix, 'ipv6'));

const MAPPED_DOTTED = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/;
const MAPPED_HEX = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/;

/**
 * The IPv4 address inside an IPv4-mapped IPv6 address (`::ffff:7f00:1` or
 * `::ffff:127.0.0.1`), or null. Without this, `http://[::ffff:127.0.0.1]/`
 * would slip past an IPv4-only rule.
 */
export function embeddedIPv4(address: string): string | null {
  const dotted = MAPPED_DOTTED.exec(address);
  if (dotted) {
    return dotted[1];
  }
  const hex = MAPPED_HEX.exec(address);
  if (hex) {
    const high = parseInt(hex[1], 16);
    const low = parseInt(hex[2], 16);
    return `${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`;
  }
  return null;
}

/**
 * True when `address` must not be contacted. Anything that is not a valid IP
 * literal is refused too (fail closed): callers pass resolved addresses.
 */
export function isBlockedAddress(address: string): boolean {
  const value = address.replace(/^\[|\]$/g, '').split('%')[0].toLowerCase();
  if (isIPv4(value)) {
    return blocked.check(value, 'ipv4');
  }
  if (isIPv6(value)) {
    const mapped = embeddedIPv4(value);
    if (mapped) {
      return blocked.check(mapped, 'ipv4');
    }
    return blocked.check(value, 'ipv6');
  }
  return true;
}

/**
 * Config opt-in for receivers on a private network or plain `http:` (local
 * development, a self-hosted n8n or ERP). Off by default; not an admin setting.
 */
export function isPrivateNetworkAllowed(): boolean {
  return getConfig('system.webhook.allowPrivateNetworks', false) === true;
}
