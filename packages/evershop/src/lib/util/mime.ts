/**
 * Media type by file extension.
 *
 * The extension is the only type signal available uniformly. An S3
 * `ListObjectsV2` response does not carry `ContentType` at all (only
 * `HeadObject` does, which would be one request per file), while Azure and GCS
 * listings do — so reading it from the provider would make the file browser
 * behave differently depending on where the store keeps its media. Deriving it
 * from the name costs nothing and behaves the same everywhere.
 *
 * It is a hint for presentation — which icon to draw, whether to attempt a
 * thumbnail — never a security control. Upload validation checks the real
 * type (`getMulter`), and nothing here is trusted for that.
 */
const MIME_BY_EXT: Record<string, string> = {
  // images
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.bmp': 'image/bmp',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  // video
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  // audio
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  // documents
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.doc': 'application/msword',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx':
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // archives
  '.zip': 'application/zip',
  '.gz': 'application/gzip',
  '.rar': 'application/vnd.rar',
  '.7z': 'application/x-7z-compressed',
  // fonts
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf'
};

/**
 * The extension of a path, lowercased, including the leading dot.
 *
 * Hand-rolled rather than `path.posix.extname` so this module stays free of
 * Node builtins: the file browser runs it in the ADMIN BUNDLE, and webpack
 * cannot resolve `path` there — importing it threw "Cannot find module 'path'"
 * at load and took the whole admin page down with it.
 *
 * Matches extname's semantics on the cases that matter here: a dot in a
 * directory name is not an extension (`dir.x/file`), a leading dot is the
 * whole name and not an extension (`.gitignore`), and the LAST dot wins
 * (`archive.tar.gz`).
 */
function extensionOf(assetPath: string): string {
  const base = assetPath.slice(assetPath.lastIndexOf('/') + 1);
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(dot).toLowerCase() : '';
}

/** `application/octet-stream` for anything unrecognised. */
export function mimeFor(assetPath: string): string {
  return MIME_BY_EXT[extensionOf(assetPath)] ?? 'application/octet-stream';
}

/**
 * Whether a browser will render this as a picture. Drives the file browser's
 * choice between a thumbnail and a type badge — an `<img>` pointed at a PDF
 * renders as a broken image, which is what it used to do for every
 * non-image in the media folder.
 */
export function isImageMime(mimeType: string | undefined): boolean {
  return !!mimeType && mimeType.startsWith('image/');
}

/**
 * A file extension for a media type — the reverse of the table above, derived
 * from it rather than written twice so the two cannot drift.
 *
 * Where several extensions share a type the FIRST in the table wins, which is
 * why the table lists the canonical spelling first (`.jpg` before `.jpeg`).
 * Returns an empty string for an unrecognised type, so callers can decide
 * whether a name without an extension is acceptable.
 */
export function extensionForMime(mimeType: string | undefined): string {
  if (!mimeType) {
    return '';
  }
  const target = mimeType.trim().toLowerCase();
  const hit = Object.entries(MIME_BY_EXT).find(([, type]) => type === target);
  return hit ? hit[0] : '';
}
