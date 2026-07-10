import { describe, it, expect, beforeEach } from '@jest/globals';

const { getAllowedImageHosts, registerAllowedImageHostsProvider } =
  await import('../../secureFetch.js');

describe('getAllowedImageHosts', () => {
  beforeEach(() => {
    delete process.env.IMAGE_ALLOWED_HOSTS;
  });

  it('parses the env variable: trimmed, lowercased, empties dropped', () => {
    process.env.IMAGE_ALLOWED_HOSTS = ' CDN.Example.com , images.internal,,';
    expect(getAllowedImageHosts()).toEqual([
      'cdn.example.com',
      'images.internal'
    ]);
  });

  it('unions provider-contributed hosts with the env list, deduped', () => {
    process.env.IMAGE_ALLOWED_HOSTS = 'cdn.example.com';
    registerAllowedImageHostsProvider(() => [
      'Bucket.s3.eu-west-1.amazonaws.com',
      'cdn.example.com'
    ]);
    expect(getAllowedImageHosts()).toEqual([
      'cdn.example.com',
      'bucket.s3.eu-west-1.amazonaws.com'
    ]);
  });

  it('skips a provider that throws instead of breaking the allowlist', () => {
    registerAllowedImageHostsProvider(() => {
      throw new Error('settings unavailable');
    });
    registerAllowedImageHostsProvider(() => ['still.works.example']);
    expect(getAllowedImageHosts()).toContain('still.works.example');
  });
});
