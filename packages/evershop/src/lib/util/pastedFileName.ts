import { extensionForMime } from './mime.js';

/**
 * A distinct name for a file that arrived on the clipboard.
 *
 * Every pasted image is called `image.png` — the browser has no other name to
 * give it — and the server's `generateFileName` only sanitises, it does not
 * de-duplicate. Two pastes would therefore land on the same key and the second
 * would overwrite the first, with nothing to show for it. The stamp and the
 * index make each one its own file.
 *
 * A file pasted from a file manager DOES carry a real name, and that is kept:
 * renaming `quarterly-report.pdf` to `pasted-20260930120000.pdf` would be
 * losing information the user gave us.
 *
 * @param name  the browser-supplied name, often `image.png` or empty
 * @param type  the media type, used for the extension when the name has none
 * @param stamp caller-supplied so a batch pasted together shares one stamp
 * @param index position within that batch, or undefined when pasting one file
 */
/**
 * A usable base name from the URL an image was copied from.
 *
 * Copying an image out of a web page puts the pixels on the clipboard with no
 * name — but usually also the `<img>` markup, and the source URL in it carries
 * the name the site gave the file. `chocolate-cake.jpg` beats
 * `pasted-20260930142233.png` for anyone who later has to find it.
 *
 * The extension is deliberately DROPPED here and taken from the real media
 * type instead: a browser re-encodes a copied image (a JPEG on the page
 * arrives as PNG bytes), so the URL's extension would describe something the
 * file is not.
 *
 * Returns '' when the URL yields nothing worth using, which includes the cases
 * that matter: a `data:` URI, a path ending in a slash, and a name that is
 * nothing but separators once the server has sanitised it.
 */
export function baseNameFromUrl(url: string | undefined): string {
  if (!url) {
    return '';
  }
  if (/^data:/i.test(url.trim())) {
    return '';
  }
  // Parsed rather than split on "/": a trailing slash means there is no file
  // name, and splitting-then-filtering silently returned the DIRECTORY there
  // ("…/img/" gave "img", which would name every paste the same thing). The
  // base makes a relative `<img src="/a/b.png">` work too.
  let pathname: string;
  try {
    pathname = new URL(url, 'https://invalid.example').pathname;
  } catch {
    pathname = url.split(/[?#]/)[0];
  }
  const segment = pathname.slice(pathname.lastIndexOf('/') + 1);
  let decoded: string;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    decoded = segment;
  }
  const withoutExtension = decoded.includes('.')
    ? decoded.slice(0, decoded.lastIndexOf('.'))
    : decoded;
  // The server replaces every non-alphanumeric with "-"; a name that survives
  // that as nothing but dashes identifies nothing, so reject it here and let
  // the timestamp name take over.
  if (!/[a-z0-9]/i.test(withoutExtension)) {
    return '';
  }
  // Long enough to stay descriptive, short enough not to dominate a listing.
  return withoutExtension.slice(0, 60);
}

export function pastedFileName(
  name: string,
  type: string | undefined,
  stamp: string,
  index?: number,
  /** The URL the image was copied from, when the clipboard carried one. */
  sourceUrl?: string
): string {
  const generic = !name || /^image\.\w+$/i.test(name);
  if (!generic) {
    return name;
  }
  const fromType = extensionForMime(type);
  // A name from the source URL is better than a timestamp, so prefer it — but
  // still suffix a batch, since one page can supply several images with the
  // same name.
  const fromUrl = baseNameFromUrl(sourceUrl);
  if (fromUrl) {
    const suffix = index === undefined ? '' : `-${index + 1}`;
    return `${fromUrl}${suffix}${fromType}`;
  }
  const fromName =
    name && name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
  const suffix = index === undefined ? '' : `-${index + 1}`;
  return `pasted-${stamp}${suffix}${fromType || fromName}`;
}

/** `20260930T142233Z` collapsed to `20260930142233` — sortable, name-safe. */
export function clipboardStamp(now: Date = new Date()): string {
  return now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
}
