import { IMP_03 } from '../rules/importPhaseRules.js';
import type { ImportIssue } from '../types.js';

/**
 * Why an image could not be read (IMG-03, IMG-04, IMP-03). Stable: the page
 * shows the reason in the admin's language.
 */
export type ImageProblemReason =
  | 'invalid_url'
  | 'blocked'
  | 'timeout'
  | 'network'
  | 'http_status'
  | 'too_many_redirects'
  | 'not_an_image'
  | 'type_not_allowed'
  | 'too_large'
  | 'empty'
  | 'storage_failed';

/** Raised by an `ImageFetcher`. The row that holds the URL fails with it. */
export class ImageError extends Error {
  readonly reason: ImageProblemReason;

  readonly params: Record<string, unknown>;

  constructor(
    reason: ImageProblemReason,
    params: Record<string, unknown> = {}
  ) {
    super(reason);
    this.name = 'ImageError';
    this.reason = reason;
    this.params = params;
  }
}

export interface StoredImage {
  /**
   * What the service gets as `origin_image` or `image`: the URL path that
   * `uploadFile` returned for the stored file.
   */
  url: string;
  /** False when the URL already pointed into this store's own storage (IMG-06). */
  copied: boolean;
}

/**
 * The port of everything about images (§ 4.5). The real one downloads through
 * the SSRF guard and stores the file with `uploadFile`; the test double is
 * `FakeImageFetcher` (testing/).
 */
export interface ImageFetcher {
  /**
   * Reads the image at `url` and stores it in the store's own file storage.
   * The destination comes from the URL (§ 5.8), so reading the same URL again
   * replaces the file and never adds a copy. Throws `ImageError`.
   */
  fetchAndStore(url: string): Promise<StoredImage>;
  /**
   * Checks that the image can be reached, without storing it (IMG-05, the dry
   * run with "Check that image URLs can be reached"). Throws `ImageError`.
   */
  probe(url: string): Promise<void>;
}

function describe(error: ImageError): string {
  const { reason, params } = error;
  switch (reason) {
    case 'invalid_url':
      return 'is not an address that can be read: it must start with http:// or https:// and have no user name or password.';
    case 'blocked':
      return 'points to a private or reserved address, which is not allowed.';
    case 'timeout':
      return 'did not answer in time.';
    case 'network':
      return `could not be reached (${String(
        params.code ?? 'network error'
      )}).`;
    case 'http_status':
      return `answered with the status ${String(
        params.status
      )} and not with an image.`;
    case 'too_many_redirects':
      return `is redirected more than ${String(params.max)} times.`;
    case 'not_an_image':
      return params.contentType
        ? `is not an image: the server says it is ${String(
            params.contentType
          )}.`
        : 'is not an image: the server does not say what it is.';
    case 'type_not_allowed':
      return `is a type of image that this store does not accept (${String(
        params.contentType
      )}).`;
    case 'too_large':
      return `is larger than the ${String(
        params.maxMb
      )} MB that this store accepts for ${String(params.contentType)}.`;
    case 'empty':
      return 'is empty.';
    default:
      return 'could not be saved in the file storage.';
  }
}

/** The issue of a row whose image failed. */
export function imageIssue(
  error: ImageError,
  where: { rowNumber: number; column: string; value: string }
): ImportIssue {
  return IMP_03.issue({
    rowNumber: where.rowNumber,
    column: where.column,
    params: { reason: error.reason, ...error.params },
    message: `The image in column "${where.column}" ${describe(error)}`,
    value: where.value
  });
}
