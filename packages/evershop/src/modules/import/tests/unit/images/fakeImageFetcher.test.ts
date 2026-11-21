import { createHash } from 'crypto';
import { describe, it, expect } from '@jest/globals';
import { generateFileName } from '../../../../cms/services/generateFileName.js';
import { ImageError } from '../../../services/images/types.js';
import { FakeImageFetcher } from '../../../testing/FakeImageFetcher.js';
import { imageFetcherContract } from '../helpers/imageFetcherContract.js';

const keyDeps = {
  sha256Hex: (text: string) => createHash('sha256').update(text).digest('hex'),
  sanitizeFileName: generateFileName as (original: string) => string
};

imageFetcherContract('FakeImageFetcher', async () => {
  const fetcher = new FakeImageFetcher(keyDeps);
  const urls = {
    ok: 'https://shop.test/ok.png',
    notFound: 'https://shop.test/missing.png',
    notImage: 'https://shop.test/page.png',
    tooLarge: 'https://shop.test/huge.png',
    blocked: 'http://169.254.169.254/latest.png',
    unreachable: 'https://nowhere.test/a.png'
  };
  fetcher
    .hasImage(urls.ok)
    .fails(urls.notFound, new ImageError('http_status', { status: 404 }))
    .fails(
      urls.notImage,
      new ImageError('not_an_image', { contentType: 'text/html' })
    )
    .fails(
      urls.tooLarge,
      new ImageError('too_large', { contentType: 'image/png', maxMb: 10 })
    )
    .fails(urls.blocked, new ImageError('blocked'));
  return {
    context: { fetcher, urls, setPrivateAllowed: () => undefined },
    cleanup: async () => undefined
  };
});

describe('FakeImageFetcher', () => {
  it('records what it was asked, in order', async () => {
    const fake = new FakeImageFetcher(keyDeps).hasImage('https://x.test/a.png');
    await fake.fetchAndStore('https://x.test/a.png');
    await fake.probe('https://x.test/a.png');
    await fake.fetchAndStore('https://x.test/a.png');
    expect(fake.fetched).toEqual([
      'https://x.test/a.png',
      'https://x.test/a.png'
    ]);
    expect(fake.probed).toEqual(['https://x.test/a.png']);
  });

  it('waits on the sleep it was given, and not otherwise', async () => {
    const waits: number[] = [];
    const fake = new FakeImageFetcher(keyDeps, async (ms) => {
      waits.push(ms);
    })
      .hasImage('https://x.test/slow.png')
      .hasImage('https://x.test/fast.png')
      .delayAnswer('https://x.test/slow.png', 5000);
    await fake.fetchAndStore('https://x.test/slow.png');
    await fake.fetchAndStore('https://x.test/fast.png');
    expect(waits).toEqual([5000]);
  });

  it('keeps an address in its own storage as it is', async () => {
    const fake = new FakeImageFetcher(keyDeps, undefined, [
      'https://shop.test/assets/'
    ]);
    expect(await fake.fetchAndStore('https://shop.test/assets/a.png')).toEqual({
      url: 'https://shop.test/assets/a.png',
      copied: false
    });
  });

  it('refuses an image type that has no extension', async () => {
    const fake = new FakeImageFetcher(keyDeps).hasImage(
      'https://x.test/a.svg',
      'image/svg+xml'
    );
    await expect(
      fake.fetchAndStore('https://x.test/a.svg')
    ).rejects.toMatchObject({
      reason: 'type_not_allowed'
    });
  });
});
