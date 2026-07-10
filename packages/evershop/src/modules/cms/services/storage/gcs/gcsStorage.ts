import type { FileBrowser } from '../../browFiles.js';
import type { UploadedFile } from '../../uploadFile.js';
import { buildKey, encodeKeyForUrl, trimTrailingSlash } from '../buildKey.js';
import type { GcsStorageConfig } from '../storageConfig.js';
import type {
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
  list: async (
    path: string
  ): Promise<{ files: FileBrowser[]; folders: string[] }> => {
    const { bucket, config } = await getGcsBucket();
    const key = buildKey(path);
    const prefix = key ? `${key}/` : '';
    const folders: string[] = [];
    const files: FileBrowser[] = [];
    // With a delimiter the API returns one level only: objects at this level
    // plus the virtual sub-directories in `apiResponse.prefixes`. Manual
    // pagination (autoPaginate: false) because the auto-paginated form drops
    // the apiResponse that carries the prefixes.
    let pageToken: string | undefined;
    do {
       
      const [pageFiles, nextQuery, apiResponse] = await bucket.getFiles({
        prefix,
        delimiter: '/',
        autoPaginate: false,
        ...(pageToken ? { pageToken } : {})
      });
      const response = apiResponse as { prefixes?: string[] } | undefined;
      (response?.prefixes || []).forEach((commonPrefix) => {
        const name = commonPrefix.slice(prefix.length).replace(/\/$/, '');
        if (name && !folders.includes(name)) {
          folders.push(name);
        }
      });
      pageFiles.forEach((file) => {
        // The zero-byte `{prefix}/` object is the folder marker, not a file.
        if (!file.name || file.name === prefix) {
          return;
        }
        files.push({
          name: file.name.slice(prefix.length),
          url: buildGcsObjectUrl(config, file.name)
        });
      });
      pageToken = (nextQuery as { pageToken?: string } | null)?.pageToken;
    } while (pageToken);
    return { files, folders };
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
