import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { CONSTANTS } from '../../../lib/helpers.js';
import { buildUrl } from '../../../lib/router/buildUrl.js';
import { mimeFor } from '../../../lib/util/mime.js';
import { getValueSync } from '../../../lib/util/registry.js';
import {
  decodeCursor,
  encodeCursor,
  type DecodedCursor
} from './storage/cursor.js';
import { getFileStorageProvider } from './storage/storageConfig.js';
import type { ListOptions, ListResult } from './storage/types.js';

export interface FileBrowser {
  name: string;
  url: string;
  /**
   * Bytes. Every object store already reports this in its listing (S3's
   * `Size`, Azure's `contentLength`, GCS's `metadata.size`), so it costs
   * nothing extra; local reads it with one `stat` per file on the page.
   *
   * Optional because a provider written before this existed will not set it.
   * The browser renders without it rather than showing a wrong number.
   */
  size?: number;
  /**
   * Media type derived from the file extension — see `lib/util/mime.ts` for
   * why the extension and not the provider's stored content type.
   *
   * There is deliberately no `width`/`height` here. No listing API on any
   * provider reports image dimensions; getting them server-side would mean
   * reading every file's header, one request each on cloud storage. The
   * browser already downloads an image to draw its thumbnail, so the UI reads
   * `naturalWidth`/`naturalHeight` off the loaded element instead — free, and
   * absent for the non-images where dimensions are meaningless anyway.
   */
  mimeType?: string;
}

export type { ListOptions, ListResult } from './storage/types.js';

/** Guard against a caller asking for a page that defeats the point. */
const MAX_LIST_LIMIT = 500;

/**
 * Entries per page when the caller does not say. A folder listing is rendered
 * as a thumbnail grid, so this is "enough to fill a tall screen and a bit
 * more".
 */
export const DEFAULT_LIST_LIMIT = 100;

export interface BrowseOptions {
  limit?: number;
  cursor?: string;
  prefix?: string;
}

/**
 * List one level of the media folder, one page at a time.
 *
 * PAGING IS ON BY DEFAULT: `browFiles(path)` returns at most
 * `DEFAULT_LIST_LIMIT` entries plus a `nextCursor`. To walk a whole folder,
 * loop until the cursor is gone:
 *
 * ```ts
 * let cursor: string | undefined;
 * do {
 *   const page = await browFiles(path, { cursor });
 *   // …use page.files / page.folders…
 *   cursor = page.nextCursor;
 * } while (cursor);
 * ```
 *
 * Entries come back in name order, ascending. That is not a preference — S3,
 * Azure Blob and GCS all list in lexicographic key order and offer no other,
 * so it is the only ordering every backend can serve without reading the whole
 * folder. For the same reason there is no total count and no page number.
 *
 * @param path the folder path, relative to the media root
 */
export const browFiles = async (
  path: string,
  options: BrowseOptions = {}
): Promise<ListResult> => {
  /**
   * @type {Object} uploader
   * @property {Function} list
   */
  const provider = getFileStorageProvider();
  const fileBrowser = getValueSync(
    'fileBrowser',
    localFileBrowser,
    {
      config: provider
    },
    (value) =>
      // The value must be an object with an delete method
      value && typeof value.list === 'function'
  );

  const limit = Math.min(
    Math.max(Math.trunc(options.limit ?? DEFAULT_LIST_LIMIT), 1),
    MAX_LIST_LIMIT
  );
  // Throws InvalidCursorError if the cursor belongs to another provider —
  // possible because the storage backend can be switched while a tab is open.
  const cursor = decodeCursor(options.cursor, provider);
  const listOptions: ListOptions = {
    limit,
    ...(cursor === undefined ? {} : { cursor: cursor.token }),
    ...(options.prefix ? { prefix: options.prefix } : {})
  };

  const result = await fileBrowser.list(path, listOptions);
  return normalizePage(result, listOptions, provider, cursor);
};

/**
 * Turn whatever the provider returned into exactly one page.
 *
 * Exported for tests: this encodes the compatibility contract that lets a
 * provider written before pagination keep working, and that contract is worth
 * pinning down.
 *
 * Two modes, decided by whether the provider produced a cursor of its own:
 *
 * PROVIDER PAGED (a native cursor came back). Its page is authoritative and is
 * passed through untouched apart from ordering. The native token is opaque —
 * it is NOT a file name, so it must never be compared against one.
 *
 * PROVIDER DID NOT PAGE (no cursor). Either the listing ended, or the provider
 * ignored `options` and handed back the whole folder; both are handled the
 * same way, because they are indistinguishable when the folder is smaller than
 * one page, and treating them alike costs nothing. The service applies the
 * prefix and the cursor itself, sorts, and cuts the page — so a third-party
 * provider that predates pagination still gets correct pages and a working
 * search, just at the cost of a full listing per page.
 *
 * The prefix is re-applied in BOTH modes. It is idempotent — a provider that
 * already filtered returns only matching names, so filtering again removes
 * nothing — and applying it unconditionally is what stops search from silently
 * doing nothing on a legacy provider whose folder happens to fit in one page.
 * That case had no other tell.
 */
export function normalizePage(
  result: ListResult,
  options: ListOptions,
  provider: string,
  cursor?: DecodedCursor
): ListResult {
  const byName = (x: { name: string }, y: { name: string }) =>
    x.name < y.name ? -1 : x.name > y.name ? 1 : 0;
  const matchesPrefix = (name: string) =>
    options.prefix ? name.startsWith(options.prefix) : true;

  // Folders are never paged — see ListResult.folders. They pass through as
  // the provider gave them, filtered and ordered but never cut.
  const folders = (result.folders || []).filter(matchesPrefix).sort();
  const files = (result.files || []).filter((f) => matchesPrefix(f.name));

  if (result.nextCursor !== undefined) {
    return {
      folders,
      files: files.sort(byName),
      nextCursor: encodeCursor(provider, 'native', result.nextCursor)
    };
  }

  // Seek by NAME rather than by offset: an offset shifts under the reader
  // when a file is uploaded or deleted between two pages, silently skipping
  // or repeating one. Only ever applied to a cursor this service minted — a
  // provider's native token is not a name.
  const seeking =
    cursor?.kind === 'name'
      ? files.filter((f) => f.name > cursor.token)
      : files;
  const sorted = seeking.sort(byName);
  const page = sorted.slice(0, options.limit);
  const last = page[page.length - 1];

  return {
    folders,
    files: page,
    ...(sorted.length > page.length && last
      ? { nextCursor: encodeCursor(provider, 'name', last.name) }
      : {})
  };
}

/**
 * Size of one file, or undefined if it cannot be read. A file can disappear
 * between the readdir and the stat — a listing is not a lock — and losing the
 * whole page over one vanished file would be the wrong trade.
 */
function statSizeOf(fullPath: string): number | undefined {
  try {
    return statSync(fullPath).size;
  } catch {
    return undefined;
  }
}

const localFileBrowser = {
  list: async (path: string, options?: ListOptions): Promise<ListResult> => {
    const targetPath = join(CONSTANTS.MEDIAPATH, path);
    if (!existsSync(targetPath)) {
      throw new Error('Requested path does not exist');
    }
    // Strip leading/trailing slashes from the input path so the joined
    // relative path doesn't start with `/`. `buildUrl('staticAsset', ['x'])`
    // appends to `/assets/`, so an input like `/x` produced `/assets//x`
    // (double slash) and broke the storefront `imageProcessor` lookup.
    const cleanPath = path.replace(/^\/+|\/+$/g, '');
    const relative = (name: string) =>
      cleanPath ? `${cleanPath}/${name}` : name;

    // One readdir, not two — the previous code called it once per kind, so
    // every listing walked the directory twice.
    const dirents = readdirSync(targetPath, { withFileTypes: true });
    const byName = (x: { name: string }, y: { name: string }) =>
      x.name < y.name ? -1 : x.name > y.name ? 1 : 0;
    const matchesPrefix = (entry: { name: string }) =>
      options?.prefix ? entry.name.startsWith(options.prefix) : true;

    // Folders: complete, and only with the first page. The disk hands them
    // over for free, so there is never a reason to make the sidebar wait.
    const folders = options?.cursor
      ? []
      : dirents
          .filter((d) => d.isDirectory())
          .filter(matchesPrefix)
          .sort(byName)
          .map((d) => d.name);

    // Files: paged by name-seek. A numeric offset would shift under the
    // reader when a file is uploaded or deleted between two pages.
    const files = dirents
      .filter((d) => d.isFile())
      .filter(matchesPrefix)
      .filter((d) => (options?.cursor ? d.name > options.cursor : true))
      .sort(byName);

    const limit = options?.limit ?? files.length;
    const page = files.slice(0, limit);
    const last = page[page.length - 1];

    return {
      folders,
      // `stat` runs only for the files on this page, never the whole
      // directory — the cost scales with the page, not the folder.
      files: page.map((f) => ({
        url: buildUrl('staticAsset', [relative(f.name)]),
        name: f.name,
        size: statSizeOf(join(targetPath, f.name)),
        mimeType: mimeFor(f.name)
      })),
      ...(files.length > page.length && last ? { nextCursor: last.name } : {})
    };
  }
};
