import { describe, it, expect } from '@jest/globals';
import { embeddedIPv4, isBlockedAddress } from '../../services/ipBlockList.js';

describe('isBlockedAddress', () => {
  it.each([
    '127.0.0.1',
    '127.255.255.254',
    '10.0.0.1',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254', // cloud metadata
    '100.64.0.1',
    '0.0.0.0',
    '224.0.0.1',
    '255.255.255.255',
    '::1',
    '::',
    'fe80::1',
    'fc00::1',
    'fd12:3456::1',
    '[::1]'
  ])('blocks %s', (address) => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  it.each([
    '8.8.8.8',
    '93.184.216.34',
    '172.32.0.1', // just outside 172.16/12
    '2606:4700:4700::1111'
  ])('allows the public address %s', (address) => {
    expect(isBlockedAddress(address)).toBe(false);
  });

  it('blocks IPv4-mapped IPv6 forms of private addresses', () => {
    expect(isBlockedAddress('::ffff:127.0.0.1')).toBe(true);
    expect(isBlockedAddress('::ffff:7f00:1')).toBe(true); // the form URL() prints
    expect(isBlockedAddress('::ffff:a9fe:a9fe')).toBe(true); // 169.254.169.254
    expect(isBlockedAddress('::ffff:10.1.2.3')).toBe(true);
  });

  it('allows an IPv4-mapped public address', () => {
    expect(isBlockedAddress('::ffff:8.8.8.8')).toBe(false);
  });

  it('ignores an IPv6 zone id', () => {
    expect(isBlockedAddress('fe80::1%eth0')).toBe(true);
  });

  it('refuses anything that is not an IP address (fail closed)', () => {
    expect(isBlockedAddress('example.com')).toBe(true);
    expect(isBlockedAddress('')).toBe(true);
  });
});

describe('embeddedIPv4', () => {
  it('extracts the IPv4 from both mapped forms', () => {
    expect(embeddedIPv4('::ffff:1.2.3.4')).toBe('1.2.3.4');
    expect(embeddedIPv4('::ffff:102:304')).toBe('1.2.3.4');
  });

  it('returns null for other addresses', () => {
    expect(embeddedIPv4('2001:db8::1')).toBeNull();
    expect(embeddedIPv4('1.2.3.4')).toBeNull();
  });
});
