import { ImageError } from './types.js';

/**
 * The extension of the stored file for each type of image (IMG-07): it comes
 * from what the server said the file is, never from the URL. A type that is not
 * here has no extension to give, and is refused.
 */
const EXTENSIONS = new Map<string, string>(
  Object.entries({
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/avif': '.avif',
    'image/apng': '.apng',
    'image/bmp': '.bmp',
    'image/tiff': '.tiff',
    'image/heic': '.heic',
    'image/heif': '.heif',
    'image/x-icon': '.ico',
    'image/vnd.microsoft.icon': '.ico'
  })
);

export function extensionForImageType(type: string): string | null {
  return EXTENSIONS.get(type) ?? null;
}

/**
 * `image/PNG; charset=binary` → `image/png`. Null when there is no header or it
 * is not a media type.
 */
export function normalizeContentType(
  header: string | null | undefined
): string | null {
  if (!header) {
    return null;
  }
  const type = header.split(';')[0].trim().toLowerCase();
  return /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/.test(type)
    ? type
    : null;
}

/**
 * IMG-04: the answer is an image, of a type that the store accepts for uploads
 * (`allowed`). SVG is refused whatever the setting says: it can carry scripts.
 * (It has no extension in the table above either; the explicit check keeps the
 * rule if an entry is ever added.)
 * Returns the problem, or null when the type is fine.
 */
export function checkImageType(
  contentType: string | null,
  allowed: readonly string[]
): ImageError | null {
  if (contentType === null || !contentType.startsWith('image/')) {
    return new ImageError('not_an_image', { contentType });
  }
  if (
    contentType.startsWith('image/svg') ||
    !allowed.includes(contentType) ||
    extensionForImageType(contentType) === null
  ) {
    return new ImageError('type_not_allowed', { contentType });
  }
  return null;
}
