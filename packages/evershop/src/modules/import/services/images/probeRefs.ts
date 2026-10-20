import type { ImportIssue } from '../types.js';
import { ImageError, imageIssue } from './types.js';

/** What a check needs to reach the images of a file (IMG-05). */
export interface ImageProbing {
  /** Checks that the image can be reached, without storing it. Throws `ImageError`. */
  probe(url: string): Promise<void>;
  /** The most probes at the same time (`imageConcurrency`). */
  concurrency: number;
  signal?: AbortSignal;
}

/** One image of a row: where it is written, and its address. */
export interface ImageRef {
  rowNumber: number;
  column: string;
  url: string;
}

// What each check has learned about an address, so that the same one in many
// rows, or in many batches, is asked once.
const learned = new WeakMap<
  ImageProbing,
  Map<string, Promise<ImageError | null>>
>();

/**
 * IMG-05: with "Check that image URLs can be reached" ticked, the check asks for
 * the images of the rows (IMG-03 and IMG-04, without storing anything) and says
 * `IMAGE_UNREADABLE` for each row whose image cannot be reached. Without it, or
 * for a check that is stopped, nothing is asked and nothing is said.
 */
export async function probeImageRefs(
  probing: ImageProbing | undefined,
  refs: readonly ImageRef[]
): Promise<ImportIssue[]> {
  if (!probing || refs.length === 0) {
    return [];
  }
  let known = learned.get(probing);
  if (!known) {
    known = new Map();
    learned.set(probing, known);
  }
  const answers = known;
  const ask = (url: string): Promise<ImageError | null> => {
    const promise = probing.probe(url).then(
      () => null,
      (error: unknown) =>
        error instanceof ImageError
          ? error
          : new ImageError('network', { code: 'ERROR' })
    );
    answers.set(url, promise);
    return promise;
  };
  const urls = [
    ...new Set(refs.map((ref) => ref.url).filter((url) => !answers.has(url)))
  ];
  let next = 0;
  const work = async () => {
    while (next < urls.length && !probing.signal?.aborted) {
      const url = urls[next];
      next += 1;
      await ask(url);
    }
  };
  await Promise.all(
    Array.from(
      { length: Math.min(Math.max(1, probing.concurrency), urls.length) },
      work
    )
  );
  const issues: ImportIssue[] = [];
  for (const ref of refs) {
    const error = await answers.get(ref.url);
    if (error) {
      issues.push(
        imageIssue(error, {
          rowNumber: ref.rowNumber,
          column: ref.column,
          value: ref.url
        })
      );
    }
  }
  return issues;
}
