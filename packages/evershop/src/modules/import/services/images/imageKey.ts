import { extensionForImageType } from './imageTypes.js';

export interface ImageKeyDeps {
  /** SHA-256 of a text as 64 hexadecimal digits. */
  sha256Hex: (text: string) => string;
  /** The sanitizer of the upload API (`generateFileName`). */
  sanitizeFileName: (original: string) => string;
}

export interface ImageKey {
  /** `catalog/<aa>/<bb>`, no leading slash. */
  directory: string;
  fileName: string;
}

const MAX_NAME_LENGTH = 100;

// The last part of the path of the URL, decoded, without the extension it had.
function baseNameOf(url: string): string {
  let pathname = '';
  try {
    pathname = new URL(url).pathname;
  } catch {
    // The caller has parsed the URL; an unreadable one gets the default name.
  }
  const segment = pathname.split('/').filter(Boolean).pop() ?? '';
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    // A broken escape: use the text as it is.
  }
  return decoded.replace(/\.[A-Za-z0-9]{1,8}$/, '');
}

/**
 * Where an image is stored (§ 5.8). The folder comes from the URL, the file name
 * from the last part of its path, the extension from the content type. The same
 * URL gives the same key every time, so reading it again replaces the file; two
 * URLs with the same file name land in different folders.
 */
export function imageStorageKey(
  url: string,
  contentType: string,
  deps: ImageKeyDeps
): ImageKey {
  const extension = extensionForImageType(contentType);
  if (extension === null) {
    throw new Error(`No extension for ${contentType}`);
  }
  const hash = deps.sha256Hex(url);
  const sanitized = deps.sanitizeFileName(
    `${baseNameOf(url) || 'image'}${extension}`
  );
  const name = sanitized
    .slice(0, sanitized.length - extension.length)
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, MAX_NAME_LENGTH)
    .replace(/-$/, '');
  return {
    directory: `catalog/${hash.slice(0, 2)}/${hash.slice(2, 4)}`,
    fileName: `${name || 'image'}${extension}`
  };
}
