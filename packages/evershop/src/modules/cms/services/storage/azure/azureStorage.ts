import type { ContainerClient } from '@azure/storage-blob';
import { warning } from '../../../../../lib/log/logger.js';
import { mimeFor } from '../../../../../lib/util/mime.js';
import type { FileBrowser } from '../../browFiles.js';
import type { UploadedFile } from '../../uploadFile.js';
import { buildKey, encodeKeyForUrl, trimTrailingSlash } from '../buildKey.js';
import {
  FOLDER_SCAN_PAGE_SIZE,
  MAX_FOLDER_SCAN_REQUESTS
} from '../folderScan.js';
import { AzureStorageConfig } from '../storageConfig.js';
import {
  FileRenamerProvider,
  ListOptions,
  ListResult,
  FileBrowserProvider,
  FileDeleterProvider,
  FileUploaderProvider,
  FolderCreatorProvider
} from '../types.js';
import { getAzureContainerClient } from './azureClient.js';

/**
 * Public URL for a stored blob. Configured base URL (CDN) wins; otherwise use
 * the SDK's blob client URL — the SDK percent-encodes the blob name, which a
 * hand-concatenated `${containerUrl}/${name}` would not (reserved URL
 * characters in blob names must be escaped).
 */
const buildBlobUrl = (
  containerClient: ContainerClient,
  config: AzureStorageConfig,
  blobName: string
): string =>
  config.baseUrl
    ? `${trimTrailingSlash(config.baseUrl)}/${encodeKeyForUrl(blobName)}`
    : containerClient.getBlobClient(blobName).url;

export const azureFileUploader: FileUploaderProvider = {
  upload: async (
    files: Express.Multer.File[],
    requestedPath: string
  ): Promise<UploadedFile[]> => {
    const { containerClient, config } = await getAzureContainerClient();
    const prefix = buildKey(requestedPath);
    return Promise.all(
      files.map(async (file) => {
        const blobName = prefix ? `${prefix}/${file.filename}` : file.filename;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        // Without blobContentType the blob is stored and served as
        // application/octet-stream (the Put Blob default).
        await blockBlobClient.uploadData(file.buffer, {
          blobHTTPHeaders: { blobContentType: file.mimetype }
        });
        return {
          name: file.filename,
          mimetype: file.mimetype,
          size: file.size,
          url: config.baseUrl
            ? buildBlobUrl(containerClient, config, blobName)
            : blockBlobClient.url
        };
      })
    );
  }
};

export const azureFileBrowser: FileBrowserProvider = {
  list: async (path: string, options?: ListOptions): Promise<ListResult> => {
    const { containerClient, config } = await getAzureContainerClient();
    const key = buildKey(path);
    const prefix = key ? `${key}/` : '';
    const folders: string[] = [];
    const files: FileBrowser[] = [];
    // Hierarchical listing returns exactly one level (virtual folders as
    // `prefix` items) — flat listing would iterate every blob under the
    // prefix just to compute the folder names.
    //
    // `.byPage()` rather than the bare async iterator: the iterator pages
    // transparently and would walk the whole folder before returning. Taking a
    // single page exposes Azure's own continuation token, which is what makes
    // this resumable.
    const iterator = containerClient
      .listBlobsByHierarchy('/', {
        // A name-prefix search extends the folder prefix — native on Azure.
        prefix: options?.prefix ? `${prefix}${options.prefix}` : prefix
      })
      .byPage({
        ...(options?.limit ? { maxPageSize: options.limit } : {}),
        ...(options?.cursor ? { continuationToken: options.cursor } : {})
      });
    const page = (await iterator.next()).value;
    // Folders only travel with the FIRST page — see ListResult.folders. A
    // later page would be re-sending what the caller already has, and on
    // Azure the paged segment genuinely repeats prefixes it still overlaps.
    if (!options?.cursor) {
      for (const item of page?.segment?.blobPrefixes || []) {
        const name = item.name.slice(prefix.length).replace(/\/$/, '');
        if (name && !folders.includes(name)) {
          folders.push(name);
        }
      }
    }
    for (const item of page?.segment?.blobItems || []) {
      // The zero-byte `{prefix}/` blob is the folder marker, not a file.
      // Filter it by name — not by content length, which would hide genuine
      // empty files.
      if (item.name === prefix) {
        continue;
      }
      const name = item.name.slice(prefix.length);
      const contentLength = item.properties?.contentLength;
      files.push({
        name,
        url: buildBlobUrl(containerClient, config, item.name),
        // Already in the listing response — no extra request.
        ...(typeof contentLength === 'number' ? { size: contentLength } : {}),
        mimeType: mimeFor(name)
      });
    }
    const nextCursor = page?.continuationToken || undefined;

    // Folders must arrive complete with the first page, but a hierarchy
    // listing interleaves blobPrefixes with blobItems. Keep scanning past the
    // file page, collecting prefixes only. Bounded — see folderScan.ts.
    if (!options?.cursor && nextCursor) {
      let token: string | undefined = nextCursor;
      let scans = 0;
      while (token && scans < MAX_FOLDER_SCAN_REQUESTS) {
        scans += 1;
        const more = (
          await containerClient
            .listBlobsByHierarchy('/', {
              prefix: options?.prefix ? `${prefix}${options.prefix}` : prefix
            })
            .byPage({
              maxPageSize: FOLDER_SCAN_PAGE_SIZE,
              continuationToken: token
            })
            .next()
        ).value;
        for (const item of more?.segment?.blobPrefixes || []) {
          const name = item.name.slice(prefix.length).replace(/\/$/, '');
          if (name && !folders.includes(name)) {
            folders.push(name);
          }
        }
        token = more?.continuationToken || undefined;
      }
      if (token) {
        warning(
          `File browser: stopped enumerating sub-folders of "${path}" after ${MAX_FOLDER_SCAN_REQUESTS} requests; some folders may not be listed.`
        );
      }
    }

    return { files, folders, ...(nextCursor ? { nextCursor } : {}) };
  }
};

export const azureFileDeleter: FileDeleterProvider = {
  delete: async (path: string): Promise<void> => {
    const key = buildKey(path);
    if (!key) {
      throw new Error('Requested path is empty');
    }
    const { containerClient } = await getAzureContainerClient();
    const response = await containerClient.getBlobClient(key).deleteIfExists();
    if (!response.succeeded) {
      warning(
        `azureFileDeleter: blob "${key}" does not exist — treated as already deleted`
      );
    }
  }
};

export const azureFolderCreator: FolderCreatorProvider = {
  create: async (destinationPath: string): Promise<string> => {
    const key = buildKey(destinationPath);
    if (!key) {
      throw new Error('Requested path is empty');
    }
    const { containerClient } = await getAzureContainerClient();
    // Zero-byte `{key}/` marker blob — the virtual-folder convention; the
    // hierarchical listing groups it into the parent's `prefix` items.
    await containerClient
      .getBlockBlobClient(`${key}/`)
      .uploadData(Buffer.alloc(0));
    return key;
  }
};

export const azureFileRenamer: FileRenamerProvider = {
  rename: async (fromPath: string, toPath: string): Promise<void> => {
    const { containerClient, config } = await getAzureContainerClient();
    const fromKey = buildKey(fromPath);
    const toKey = buildKey(toPath);
    if (!fromKey || !toKey) {
      throw new Error('Requested path is empty');
    }
    if (fromKey === toKey) {
      return;
    }
    // Blob storage has no rename either: copy, wait for it to finish, then
    // delete. `syncCopyFromURL` is server-side and returns only once the copy
    // is done, so there is no polling to get wrong.
    const source = containerClient.getBlobClient(fromKey);
    const target = containerClient.getBlobClient(toKey);
    if (await target.exists()) {
      throw new Error('A file with that name already exists');
    }
    await target.syncCopyFromURL(source.url);
    await source.deleteIfExists();
    // `config` participates so the signature matches the other providers'
    // dependency on it; nothing here needs a value from it.
    void config;
  }
};
