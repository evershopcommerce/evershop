import { describe, it, expect } from '@jest/globals';
import {
  embeddedIPv4,
  ipv6Bytes,
  isBlockedAddress
} from '../../ipBlockList.js';

/** The text of 16 bytes as an IPv6 address, in the form `style` asks for. */
function format(
  bytes: number[],
  style: 'full' | 'short' | 'compressed' | 'dotted' | 'upper'
): string {
  const groups: string[] = [];
  for (let i = 0; i < 16; i += 2) {
    groups.push(((bytes[i] << 8) | bytes[i + 1]).toString(16));
  }
  if (style === 'full') {
    return groups.map((group) => group.padStart(4, '0')).join(':');
  }
  if (style === 'short') {
    return groups.join(':');
  }
  if (style === 'upper') {
    return groups.join(':').toUpperCase();
  }
  if (style === 'dotted') {
    return `${groups.slice(0, 6).join(':')}:${bytes.slice(12).join('.')}`;
  }
  // The longest run of zero groups becomes `::`.
  let bestStart = -1;
  let bestLength = 0;
  for (let i = 0; i < 8; ) {
    if (groups[i] !== '0') {
      i += 1;
    } else {
      let j = i;
      while (j < 8 && groups[j] === '0') j += 1;
      if (j - i > bestLength) {
        bestStart = i;
        bestLength = j - i;
      }
      i = j;
    }
  }
  if (bestLength < 2) {
    return groups.join(':');
  }
  return `${groups.slice(0, bestStart).join(':')}::${groups
    .slice(bestStart + bestLength)
    .join(':')}`;
}

const STYLES = ['full', 'short', 'compressed', 'dotted', 'upper'] as const;

function random(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state;
  };
}

describe('ipv6Bytes', () => {
  it('reads every text form of an address to the same 16 bytes', () => {
    const next = random(424242);
    for (let i = 0; i < 3000; i += 1) {
      const bytes = Array.from({ length: 16 }, () => next() % 256);
      // Zero runs of every length, where `::` can stand.
      if (i % 3 === 0) {
        const start = next() % 14;
        const length = 1 + (next() % (16 - start));
        for (let b = start; b < start + length; b += 1) bytes[b] = 0;
      }
      for (const style of STYLES) {
        const text = format(bytes, style);
        expect([text, ipv6Bytes(text)]).toEqual([text, bytes]);
      }
    }
  });

  it.each([
    ['::', Array(16).fill(0)],
    ['::1', [...Array(15).fill(0), 1]],
    ['1::', [0, 1, ...Array(14).fill(0)]],
    ['::ffff:1.2.3.4', [...Array(10).fill(0), 255, 255, 1, 2, 3, 4]],
    ['::1.2.3.4', [...Array(12).fill(0), 1, 2, 3, 4]],
    [
      '64:ff9b::127.0.0.1',
      [0, 0x64, 0xff, 0x9b, ...Array(8).fill(0), 127, 0, 0, 1]
    ],
    ['fe80::1%eth0', [0xfe, 0x80, ...Array(13).fill(0), 1]]
  ])('reads %s', (text, bytes) => {
    expect(ipv6Bytes(text)).toEqual(bytes);
  });

  it.each([
    ['1.2.3.4'],
    ['example.com'],
    [''],
    ['[::1]'],
    ['1::2::3'],
    ['12345::']
  ])('gives null for %j', (text) => {
    expect(ipv6Bytes(text)).toBeNull();
  });
});

describe('embeddedIPv4', () => {
  it.each([
    ['::ffff:1.2.3.4', '1.2.3.4'],
    ['::ffff:102:304', '1.2.3.4'],
    ['::FFFF:7F00:1', '127.0.0.1'],
    ['0:0:0:0:0:ffff:7f00:1', '127.0.0.1'],
    ['0000:0000:0000:0000:0000:ffff:127.0.0.1', '127.0.0.1'],
    ['64:ff9b::7f00:1', '127.0.0.1'],
    ['64:ff9b::127.0.0.1', '127.0.0.1'],
    ['64:ff9b:0:0:0:0:a9fe:a9fe', '169.254.169.254'],
    ['0064:FF9B::0808:0808', '8.8.8.8'],
    ['2002:7f00:1::', '127.0.0.1'],
    ['2002:7f00:0001:abcd:1:2:3:4', '127.0.0.1'],
    ['2002:808:808::1', '8.8.8.8'],
    ['2002:a9fe:a9fe::', '169.254.169.254']
  ])('reads the IPv4 address in %s', (address, ipv4) => {
    expect(embeddedIPv4(address)).toBe(ipv4);
  });

  it.each([
    ['2001:db8::1'],
    ['2606:4700:4700::1111'],
    ['::1'],
    ['::'],
    ['1.2.3.4'],
    ['example.com'],
    // Just outside the ranges.
    ['64:ff9b:1::7f00:1'],
    ['64:ff9a::7f00:1'],
    ['64:ff9b::1:7f00:1'],
    ['64:ff9b:0:0:0:100:7f00:1'],
    ['64:ff9b:0:0:8000::7f00:1'],
    ['164:ff9b::7f00:1'],
    ['2003:7f00:1::'],
    ['2001:7f00:1::'],
    ['::fffe:7f00:1'],
    ['1::ffff:7f00:1']
  ])('gives null for %s', (address) => {
    expect(embeddedIPv4(address)).toBeNull();
  });
});

describe('isBlockedAddress', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '169.254.169.254',
    '192.168.1.1',
    '::1',
    'fe80::1',
    'fd00::1'
  ])('still blocks %s', (address) => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  it.each([
    // NAT64 (64:ff9b::/96) with a private IPv4 address.
    '64:ff9b::7f00:1',
    '64:ff9b::127.0.0.1',
    '64:ff9b:0:0:0:0:7f00:1',
    '64:FF9B::A9FE:A9FE',
    '64:ff9b::a00:1',
    '64:ff9b::c0a8:101',
    '64:ff9b::ac10:1',
    '64:ff9b::6440:1',
    '64:ff9b::',
    // 6to4 (2002::/16) with a private IPv4 address.
    '2002:7f00:1::',
    '2002:7f00:0001::1',
    '2002:a9fe:a9fe::',
    '2002:a00:1:1:2:3:4:5',
    '2002:c0a8:101::1',
    '2002:ac10::1',
    '2002:0:0::',
    '2002:ffff:ffff::',
    // IPv4-mapped, in forms the compact regular expressions missed.
    '0:0:0:0:0:ffff:7f00:1',
    '::FFFF:7F00:1',
    '0000:0000:0000:0000:0000:ffff:127.0.0.1'
  ])('blocks %s: the IPv4 address inside is private', (address) => {
    expect(isBlockedAddress(address)).toBe(true);
    expect(isBlockedAddress(`[${address}]`)).toBe(true);
  });

  it.each([
    '64:ff9b::808:808',
    '64:ff9b::5db8:d822',
    '64:ff9b::8.8.8.8',
    '2002:808:808::1',
    '2002:5db8:d822::1',
    '::ffff:8.8.8.8',
    '0:0:0:0:0:ffff:808:808'
  ])(
    'allows %s: the IPv4 address inside is public (an IPv6-only network with DNS64 needs it)',
    (address) => {
      expect(isBlockedAddress(address)).toBe(false);
    }
  );

  it('judges an address that embeds an IPv4 address as that address itself, for any IPv4 address', () => {
    const next = random(777);
    const addresses = ['0.0.0.0', '255.255.255.255', '127.0.0.1', '8.8.8.8'];
    for (let i = 0; i < 4000; i += 1) {
      addresses.push(
        `${next() % 256}.${next() % 256}.${next() % 256}.${next() % 256}`
      );
    }
    // The edges of every blocked range, and one step outside each.
    for (const edge of [
      '9.255.255.255',
      '10.0.0.0',
      '10.255.255.255',
      '11.0.0.0',
      '100.63.255.255',
      '100.64.0.0',
      '100.127.255.255',
      '100.128.0.0',
      '126.255.255.255',
      '128.0.0.0',
      '169.253.255.255',
      '169.254.0.0',
      '169.254.255.255',
      '169.255.0.0',
      '172.15.255.255',
      '172.16.0.0',
      '172.31.255.255',
      '172.32.0.0',
      '192.167.255.255',
      '192.168.0.0',
      '192.168.255.255',
      '192.169.0.0',
      '198.17.255.255',
      '198.18.0.0',
      '198.19.255.255',
      '198.20.0.0',
      '223.255.255.255',
      '224.0.0.0',
      '239.255.255.255',
      '240.0.0.0'
    ]) {
      addresses.push(edge);
    }
    for (const ipv4 of addresses) {
      const [a, b, c, d] = ipv4.split('.').map(Number);
      const high = ((a << 8) | b).toString(16);
      const low = ((c << 8) | d).toString(16);
      const expected = isBlockedAddress(ipv4);
      for (const address of [
        `::ffff:${high}:${low}`,
        `64:ff9b::${high}:${low}`,
        `2002:${high}:${low}::1`
      ]) {
        if (isBlockedAddress(address) !== expected) {
          throw new Error(`${address} and ${ipv4} are judged differently`);
        }
      }
    }
  });

  it('reads an address in brackets, as it stands in a URL', () => {
    expect(isBlockedAddress('[2606:4700:4700::1111]')).toBe(false);
    expect(isBlockedAddress('[64:ff9b::808:808]')).toBe(false);
    expect(isBlockedAddress('[::1]')).toBe(true);
  });

  it('refuses anything that is not an IP address (fail closed)', () => {
    expect(isBlockedAddress('example.com')).toBe(true);
    expect(isBlockedAddress('')).toBe(true);
    expect(isBlockedAddress('64:ff9b::zz')).toBe(true);
  });
});
