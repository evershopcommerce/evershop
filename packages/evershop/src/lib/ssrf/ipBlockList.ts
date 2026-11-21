import { BlockList, isIPv4, isIPv6 } from 'net';

/**
 * Addresses that outbound requests made for a user must never reach (SSRF
 * protection): loopback, private ranges, link-local (including the
 * 169.254.169.254 cloud metadata address), and other reserved space. Shared by
 * the webhooks and the import of images. Pure: it reads no configuration.
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

/**
 * The 16 bytes of an IPv6 address in any text form (`::`, upper case, leading
 * zeros, an IPv4 tail such as `::ffff:1.2.3.4`), or null when the text is not
 * an IPv6 address. A zone id (`%eth0`) is ignored.
 */
export function ipv6Bytes(address: string): number[] | null {
  let text = address.split('%')[0];
  if (!isIPv6(text)) {
    return null;
  }
  const lastColon = text.lastIndexOf(':');
  const tail = text.slice(lastColon + 1);
  if (tail.includes('.')) {
    // Write the IPv4 tail as the two groups it stands for.
    const [a, b, c, d] = tail.split('.').map(Number);
    text = `${text.slice(0, lastColon + 1)}${((a << 8) | b).toString(16)}:${(
      (c << 8) |
      d
    ).toString(16)}`;
  }
  const halves = text.split('::');
  const head = halves[0] === '' ? [] : halves[0].split(':');
  const rest =
    halves.length > 1 && halves[1] !== '' ? halves[1].split(':') : [];
  const groups =
    halves.length > 1
      ? [
          ...head,
          ...Array(Math.max(0, 8 - head.length - rest.length)).fill('0'),
          ...rest
        ]
      : head;
  const bytes: number[] = [];
  for (const group of groups) {
    const value = parseInt(group, 16);
    bytes.push(value >> 8, value & 0xff);
  }
  return bytes;
}

const dotted = (bytes: number[]) => bytes.join('.');

/**
 * The IPv4 address inside an IPv6 address that stands for one, or null. Three
 * kinds stand for an IPv4 address:
 *
 * - IPv4-mapped, `::ffff:7f00:1` or `::ffff:127.0.0.1`;
 * - NAT64 with the well-known prefix, `64:ff9b::/96`, where the last 32 bits
 *   are the IPv4 address (a gateway on an IPv6-only network forwards it);
 * - 6to4, `2002::/16`, where the 32 bits after the prefix are the IPv4 address.
 *
 * Without this, `http://[64:ff9b::7f00:1]/` would slip past an IPv4-only
 * rule. A NAT64 prefix that an operator chose for their own network
 * (RFC 6052) cannot be recognized.
 */
export function embeddedIPv4(address: string): string | null {
  const bytes = ipv6Bytes(address);
  if (!bytes) {
    return null;
  }
  const zeros = (from: number, to: number) =>
    bytes.slice(from, to).every((byte) => byte === 0);
  if (zeros(0, 10) && bytes[10] === 0xff && bytes[11] === 0xff) {
    return dotted(bytes.slice(12));
  }
  if (
    bytes[0] === 0x00 &&
    bytes[1] === 0x64 &&
    bytes[2] === 0xff &&
    bytes[3] === 0x9b &&
    zeros(4, 12)
  ) {
    return dotted(bytes.slice(12));
  }
  if (bytes[0] === 0x20 && bytes[1] === 0x02) {
    return dotted(bytes.slice(2, 6));
  }
  return null;
}

/**
 * True when `address` must not be contacted. An IPv6 address that stands for an
 * IPv4 address is judged by that IPv4 address, so the ranges are not blocked
 * whole: on an IPv6-only network with DNS64 every IPv4-only host resolves into
 * `64:ff9b::/96`. Anything that is not a valid IP literal is refused too (fail
 * closed): callers pass resolved addresses.
 */
export function isBlockedAddress(address: string): boolean {
  const value = address
    .replace(/^\[|\]$/g, '')
    .split('%')[0]
    .toLowerCase();
  if (isIPv4(value)) {
    return blocked.check(value, 'ipv4');
  }
  if (isIPv6(value)) {
    const embedded = embeddedIPv4(value);
    if (embedded) {
      return blocked.check(embedded, 'ipv4');
    }
    return blocked.check(value, 'ipv6');
  }
  return true;
}
