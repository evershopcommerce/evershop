import { describe, expect, it } from '@jest/globals';
import { probeImageRefs } from '../../../services/images/probeRefs.js';
import type { ImageProbing } from '../../../services/images/probeRefs.js';
import { ImageError } from '../../../services/images/types.js';

/**
 * IMG-05: the images of a file asked for during the check, without storing them.
 * Each address is asked once however many rows hold it; a failure is one
 * `IMAGE_UNREADABLE` for each row and cell that holds the address.
 */
function probing(
  answers: Record<string, ImageError | Error | undefined> = {},
  more: Partial<ImageProbing> = {}
) {
  const asked: string[] = [];
  let running = 0;
  let mostAtOnce = 0;
  const value: ImageProbing = {
    concurrency: 2,
    probe: async (url) => {
      asked.push(url);
      running += 1;
      mostAtOnce = Math.max(mostAtOnce, running);
      await new Promise((resolve) => {
        setTimeout(resolve, 2);
      });
      running -= 1;
      const answer = answers[url];
      if (answer) throw answer;
    },
    ...more
  };
  return { value, asked, most: () => mostAtOnce };
}

const ref = (rowNumber: number, url: string, column = 'images') => ({
  rowNumber,
  column,
  url
});

describe('probeImageRefs (IMG-05)', () => {
  it('says nothing without a probe, and asks for nothing', async () => {
    expect(
      await probeImageRefs(undefined, [ref(2, 'https://x.test/a.png')])
    ).toEqual([]);
    const p = probing();
    expect(await probeImageRefs(p.value, [])).toEqual([]);
    expect(p.asked).toEqual([]);
  });

  it('says nothing for an image that can be reached', async () => {
    const p = probing();
    expect(
      await probeImageRefs(p.value, [ref(2, 'https://x.test/a.png')])
    ).toEqual([]);
    expect(p.asked).toEqual(['https://x.test/a.png']);
  });

  it('reports the rows whose image cannot be reached, each with its column and its address', async () => {
    const p = probing({
      'https://x.test/404.png': new ImageError('http_status', { status: 404 }),
      'https://x.test/slow.png': new ImageError('timeout')
    });
    const issues = await probeImageRefs(p.value, [
      ref(2, 'https://x.test/ok.png'),
      ref(3, 'https://x.test/404.png'),
      ref(4, 'https://x.test/slow.png', 'image')
    ]);
    expect(issues).toMatchObject([
      {
        code: 'IMAGE_UNREADABLE',
        severity: 'error',
        rowNumber: 3,
        column: 'images',
        value: 'https://x.test/404.png',
        params: { reason: 'http_status', status: 404 }
      },
      {
        code: 'IMAGE_UNREADABLE',
        rowNumber: 4,
        column: 'image',
        params: { reason: 'timeout' }
      }
    ]);
  });

  it('asks for an address once, however many rows hold it, and once more for none of the later batches', async () => {
    const p = probing({
      'https://x.test/bad.png': new ImageError('http_status', { status: 500 })
    });
    const first = await probeImageRefs(p.value, [
      ref(2, 'https://x.test/bad.png'),
      ref(3, 'https://x.test/bad.png'),
      ref(4, 'https://x.test/ok.png')
    ]);
    expect(first.map((i) => i.rowNumber)).toEqual([2, 3]);
    const second = await probeImageRefs(p.value, [
      ref(1002, 'https://x.test/bad.png'),
      ref(1003, 'https://x.test/ok.png')
    ]);
    expect(second.map((i) => i.rowNumber)).toEqual([1002]);
    expect(p.asked.sort()).toEqual([
      'https://x.test/bad.png',
      'https://x.test/ok.png'
    ]);
  });

  it('asks for at most `concurrency` addresses at the same time', async () => {
    const p = probing({}, { concurrency: 3 });
    await probeImageRefs(
      p.value,
      Array.from({ length: 12 }, (_, n) =>
        ref(n + 2, `https://x.test/${n}.png`)
      )
    );
    expect(p.asked).toHaveLength(12);
    expect(p.most()).toBeLessThanOrEqual(3);
    expect(p.most()).toBeGreaterThan(1);
  });

  it('turns a failure that is not an image error into one, and goes on', async () => {
    const p = probing({ 'https://x.test/a.png': new Error('boom') });
    const issues = await probeImageRefs(p.value, [
      ref(2, 'https://x.test/a.png'),
      ref(3, 'https://x.test/b.png')
    ]);
    expect(issues).toMatchObject([
      { rowNumber: 2, params: { reason: 'network' } }
    ]);
  });

  it('stops asking when the check is stopped', async () => {
    const controller = new AbortController();
    controller.abort();
    const p = probing({}, { signal: controller.signal });
    const issues = await probeImageRefs(p.value, [
      ref(2, 'https://x.test/a.png')
    ]);
    expect(p.asked).toEqual([]);
    expect(issues).toEqual([]);
  });
});
