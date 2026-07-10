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

export interface FileBrowserProvider {
  list(path: string): Promise<{ files: FileBrowser[]; folders: string[] }>;
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
