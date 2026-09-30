import { warning } from '../../../../../lib/log/logger.js';
import { mimeFor } from '../../../../../lib/util/mime.js';
import type { FileBrowser } from '../../browFiles.js';
import type { UploadedFile } from '../../uploadFile.js';
import { buildKey, encodeKeyForUrl, trimTrailingSlash } from '../buildKey.js';
import {
  FOLDER_SCAN_PAGE_SIZE,
  MAX_FOLDER_SCAN_REQUESTS
} from '../folderScan.js';
import type { GcsStorageConfig } from '../storageConfig.js';
import type {
  FileRenamerProvider,
  ListOptions,
  ListResult,
  FileBrowserProvider,
  FileDeleterProvider,
  FileUploaderProvider,
  FolderCreatorProvider
} from '../types.js';
import { getGcsBucket } from './gcsClient.js';

/**
 * Public URL for a stored object: configured base URL (CDN) wins, otherwise
 * the documented public URL format
 * `https://storage.googleapis.com/BUCKET_NAME/OBJECT_NAME`.
 */
export function buildGcsObjectUrl(
  config: GcsStorageConfig,
  key: string
): string {
  const encodedKey = encodeKeyForUrl(key);
  if (config.baseUrl) {
    return `${trimTrailingSlash(config.baseUrl)}/${encodedKey}`;
  }
  return `https://storage.googleapis.com/${config.bucket}/${encodedKey}`;
}

export const gcsFileUploader: FileUploaderProvider = {
  upload: async (
    files: Express.Multer.File[],
    requestedPath: string
  ): Promise<UploadedFile[]> => {
    const { bucket, config } = await getGcsBucket();
    const prefix = buildKey(requestedPath);
    return Promise.all(
      files.map(async (file) => {
        const key = prefix ? `${prefix}/${file.filename}` : file.filename;
        // resumable: false — a single-request upload; the buffer is already
        // in memory and resumable sessions add two extra round trips.
        await bucket.file(key).save(file.buffer, {
          resumable: false,
          contentType: file.mimetype
        });
        return {
          name: file.filename,
          mimetype: file.mimetype,
          size: file.size,
          url: buildGcsObjectUrl(config, key)
        };
      })
    );
  }
};

export const gcsFileBrowser: FileBrowserProvider = {
  list: async (path: string, options?: ListOptions): Promise<ListResult> => {
    const { bucket, config } = await getGcsBucket();
    const key = buildKey(path);
    const prefix = key ? `${key}/` : '';
    const folders: string[] = [];
    const files: FileBrowser[] = [];
    // With a delimiter the API returns one level only: objects at this level
    // plus the virtual sub-directories in `apiResponse.prefixes`. Manual
    // pagination (autoPaginate: false) because the auto-paginated form drops
    // the apiResponse that carries the prefixes — and because auto-paginating
    // would walk the whole folder before returning.
    const [pageFiles, nextQuery, apiResponse] = await bucket.getFiles({
      // A name-prefix search extends the folder prefix — native on GCS.
      prefix: options?.prefix ? `${prefix}${options.prefix}` : prefix,
      delimiter: '/',
      autoPaginate: false,
      ...(options?.limit ? { maxResults: options.limit } : {}),
      ...(options?.cursor ? { pageToken: options.cursor } : {})
    });
    const response = apiResponse as { prefixes?: string[] } | undefined;
    // Folders only travel with the FIRST page — see ListResult.folders. A
    // later page would be re-sending what the caller already has, and on
    // Azure the paged segment genuinely repeats prefixes it still overlaps.
    if (!options?.cursor) {
      (response?.prefixes || []).forEach((commonPrefix) => {
        const name = commonPrefix.slice(prefix.length).replace(/\/$/, '');
        if (name && !folders.includes(name)) {
          folders.push(name);
        }
      });
    }
    pageFiles.forEach((file) => {
      // The zero-byte `{prefix}/` object is the folder marker, not a file.
      if (!file.name || file.name === prefix) {
        return;
      }
      const name = file.name.slice(prefix.length);
      // GCS reports size as a STRING in the object metadata, unlike S3's
      // number and Azure's number.
      const rawSize = (file.metadata as { size?: string | number } | undefined)
        ?.size;
      const size = rawSize === undefined ? NaN : Number(rawSize);
      files.push({
        name,
        url: buildGcsObjectUrl(config, file.name),
        ...(Number.isFinite(size) ? { size } : {}),
        mimeType: mimeFor(name)
      });
    });
    const pageToken = (nextQuery as { pageToken?: string } | null)?.pageToken;

    // Folders must arrive complete with the first page, but a delimited
    // listing interleaves prefixes with objects. Keep scanning past the file
    // page, collecting prefixes only. Bounded — see folderScan.ts.
    if (!options?.cursor && pageToken) {
      let token: string | undefined = pageToken;
      let scans = 0;
      while (token && scans < MAX_FOLDER_SCAN_REQUESTS) {
        scans += 1;
        const [, moreQuery, moreResponse] = await bucket.getFiles({
          prefix: options?.prefix ? `${prefix}${options.prefix}` : prefix,
          delimiter: '/',
          autoPaginate: false,
          maxResults: FOLDER_SCAN_PAGE_SIZE,
          pageToken: token
        });
        (
          (moreResponse as { prefixes?: string[] } | undefined)?.prefixes || []
        ).forEach((commonPrefix) => {
          const name = commonPrefix.slice(prefix.length).replace(/\/$/, '');
          if (name && !folders.includes(name)) {
            folders.push(name);
          }
        });
        token = (moreQuery as { pageToken?: string } | null)?.pageToken;
      }
      if (token) {
        warning(
          `File browser: stopped enumerating sub-folders of "${path}" after ${MAX_FOLDER_SCAN_REQUESTS} requests; some folders may not be listed.`
        );
      }
    }

    return { files, folders, ...(pageToken ? { nextCursor: pageToken } : {}) };
  }
};

export const gcsFileDeleter: FileDeleterProvider = {
  delete: async (path: string): Promise<void> => {
    const key = buildKey(path);
    if (!key) {
      throw new Error('Requested path is empty');
    }
    const { bucket } = await getGcsBucket();
    // Idempotent delete: ignoreNotFound swallows the 404 — the goal state
    // ("file is gone") is already true.
    await bucket.file(key).delete({ ignoreNotFound: true });
  }
};

export const gcsFolderCreator: FolderCreatorProvider = {
  create: async (destinationPath: string): Promise<string> => {
    const key = buildKey(destinationPath);
    if (!key) {
      throw new Error('Requested path is empty');
    }
    const { bucket } = await getGcsBucket();
    // Zero-byte `{key}/` marker object — the virtual-folder convention; the
    // delimiter listing groups it into the parent's prefixes.
    await bucket.file(`${key}/`).save('', { resumable: false });
    return key;
  }
};

export const gcsFileRenamer: FileRenamerProvider = {
  rename: async (fromPath: string, toPath: string): Promise<void> => {
    const { bucket } = await getGcsBucket();
    const fromKey = buildKey(fromPath);
    const toKey = buildKey(toPath);
    if (!fromKey || !toKey) {
      throw new Error('Requested path is empty');
    }
    if (fromKey === toKey) {
      return;
    }
    const [exists] = await bucket.file(toKey).exists();
    if (exists) {
      throw new Error('A file with that name already exists');
    }
    // `move` is copy-then-delete performed by the client library; there is no
    // atomic rename in the API underneath it either.
    await bucket.file(fromKey).move(toKey);
  }
};
