import type { FileBrowser } from '../browFiles.js';
import type { UploadedFile } from '../uploadFile.js';

/**
 * The four provider contracts behind the `fileUploader` / `fileBrowser` /
 * `fileDeleter` / `folderCreator` registry values. A storage provider (built-in
 * or from an extension) supplies one object per contract; the cms services pick
 * the active provider per call via the registry context (`config` = the
 * configured storage provider id, e.g. `'s3'`).
 */
export interface FileUploaderProvider {
  upload(
    files: Express.Multer.File[],
    destinationPath: string
  ): Promise<UploadedFile[]>;
}

/**
 * One page of a folder listing.
 *
 * `limit` counts folders AND files together, because that is what the object
 * stores do — S3's `MaxKeys` caps `CommonPrefixes` + `Contents` combined, and
 * Azure and GCS behave the same way. A page is a window over the folder's
 * entries in name order, split by kind on the way out.
 */
export interface ListOptions {
  /** Maximum entries (folders + files) to return. */
  limit: number;
  /** Opaque cursor from a previous page's `nextCursor`. Never parse it. */
  cursor?: string;
  /**
   * Return only entries whose name starts with this string. Case-SENSITIVE:
   * it maps onto the object stores' native key-prefix filter, and none of them
   * can match case-insensitively without scanning the whole folder.
   */
  prefix?: string;
}

export interface ListResult {
  files: FileBrowser[];
  /**
   * The COMPLETE set of sub-folders at this level, returned with the FIRST
   * page and empty on every page after it (the caller already has them).
   *
   * Folders are navigation, not content, so they cannot be paged: a sidebar
   * that fills in as you press "Load more" cannot be navigated, because the
   * folder you want may not have arrived. Files are content and do page.
   *
   * This is affordable because a delimiter collapses each sub-tree into a
   * single entry — a folder holding 5,000 objects costs one, not 5,000. Only
   * a directory with more than one page of files sitting DIRECTLY in it needs
   * extra requests to finish enumerating its folders.
   */
  folders: string[];
  /**
   * Cursor for the next page of FILES, or absent at the end of the listing. It is
   * PROVIDER-SPECIFIC and opaque — an S3 continuation token, an Azure
   * continuation token, a GCS page token, or a file name for the local disk.
   * `browFiles` wraps it so a cursor cannot be replayed against a different
   * provider after the storage backend is switched.
   */
  nextCursor?: string;
}

export interface FileBrowserProvider {
  /**
   * List one level of a folder.
   *
   * `options` is optional so that a provider written before pagination existed
   * still satisfies this interface — TypeScript admits a function with fewer
   * parameters, and `{ files, folders }` is assignable to `ListResult`. Such a
   * provider ignores `options` and returns everything with no `nextCursor`;
   * `browFiles` detects that (more entries came back than were asked for) and
   * slices in memory, so the caller sees correct pages either way. It just
   * costs a full listing per page, which is what implementing `options`
   * avoids.
   */
  list(path: string, options?: ListOptions): Promise<ListResult>;
}

export interface FileDeleterProvider {
  /**
   * Deleting a path that does not exist is NOT an error — the goal state
   * ("file is gone") is already true. Providers treat it as a successful no-op
   * (S3 DeleteObject is natively idempotent; Azure uses deleteIfExists; local
   * ignores ENOENT).
   */
  delete(path: string): Promise<void>;
}

export interface FolderCreatorProvider {
  create(destinationPath: string): Promise<string>;
}

export interface FileRenamerProvider {
  /**
   * Rename a file within its folder.
   *
   * Only the last path segment changes — this is a rename, not a move. Both
   * arguments are full paths so a provider can build its own keys without
   * having to split and rejoin, which is where path bugs come from.
   *
   * No object store has a rename. S3, Azure and GCS all implement it as copy
   * then delete, which is NOT atomic: an interruption between the two leaves
   * both names present. That is the safe direction to fail — the file still
   * exists under its old name — and it is why the copy is confirmed before
   * the delete is issued.
   *
   * Refuses rather than overwrites when the target name is taken. A media
   * folder is shared, and silently replacing someone else's file to satisfy a
   * rename is not a trade worth making.
   */
  rename(fromPath: string, toPath: string): Promise<void>;
}
