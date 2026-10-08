import {
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand
} from '@aws-sdk/client-s3';
import { warning } from '../../../../../lib/log/logger.js';
import { mimeFor } from '../../../../../lib/util/mime.js';
import type { FileBrowser } from '../../browFiles.js';
import type { UploadedFile } from '../../uploadFile.js';
import { buildKey, encodeKeyForUrl, trimTrailingSlash } from '../buildKey.js';
import {
  FOLDER_SCAN_PAGE_SIZE,
  MAX_FOLDER_SCAN_REQUESTS
} from '../folderScan.js';
import type { S3StorageConfig } from '../storageConfig.js';
import type {
  FileRenamerProvider,
  ListOptions,
  ListResult,
  FileBrowserProvider,
  FileDeleterProvider,
  FileUploaderProvider,
  FolderCreatorProvider
} from '../types.js';
import { getS3Client, resolveS3Region } from './s3Client.js';

/**
 * Public URL for a stored object. Precedence: configured base URL (CDN) →
 * custom endpoint (virtual-hosted on the endpoint host, or path-style when
 * `forcePathStyle` is on — mirroring how the SDK addresses the endpoint;
 * Hetzner documents `{bucket}.{location}.your-objectstorage.com/{key}`,
 * MinIO needs path-style) → the region-qualified virtual-hosted-style AWS
 * URL. The legacy global endpoint (`{bucket}.s3.amazonaws.com`) is never
 * used: regions launched after 2019-03-20 answer it with HTTP 400 and older
 * ones with 307 redirects.
 */
export function buildObjectUrl(
  config: S3StorageConfig,
  key: string,
  region?: string
): string {
  const encodedKey = encodeKeyForUrl(key);
  if (config.baseUrl) {
    return `${trimTrailingSlash(config.baseUrl)}/${encodedKey}`;
  }
  if (config.endpoint) {
    if (!config.forcePathStyle) {
      try {
        const endpointUrl = new URL(config.endpoint);
        return `${endpointUrl.protocol}//${config.bucket}.${endpointUrl.host}/${encodedKey}`;
      } catch {
        // Unparseable endpoint — fall through to path-style below
      }
    }
    return `${trimTrailingSlash(config.endpoint)}/${
      config.bucket
    }/${encodedKey}`;
  }
  if (!region) {
    throw new Error(
      'Cannot build an S3 object URL: no region is configured or resolvable. Configure `system.s3.region`, the AWS_REGION environment variable, or the region setting.'
    );
  }
  return `https://${config.bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
}

const needsRegion = (config: S3StorageConfig): boolean =>
  !config.baseUrl && !config.endpoint;

export const s3FileUploader: FileUploaderProvider = {
  upload: async (
    files: Express.Multer.File[],
    requestedPath: string
  ): Promise<UploadedFile[]> => {
    const { client, config } = await getS3Client();
    const region = needsRegion(config)
      ? await resolveS3Region(client)
      : undefined;
    const prefix = buildKey(requestedPath);
    return Promise.all(
      files.map(async (file) => {
        const key = prefix ? `${prefix}/${file.filename}` : file.filename;
        await client.send(
          new PutObjectCommand({
            Bucket: config.bucket,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype
          })
        );
        return {
          name: file.filename,
          mimetype: file.mimetype,
          size: file.size,
          url: buildObjectUrl(config, key, region)
        };
      })
    );
  }
};

export const s3FileBrowser: FileBrowserProvider = {
  list: async (path: string, options?: ListOptions): Promise<ListResult> => {
    const { client, config } = await getS3Client();
    const region = needsRegion(config)
      ? await resolveS3Region(client)
      : undefined;
    const key = buildKey(path);
    const prefix = key ? `${key}/` : '';
    const folders: string[] = [];
    const files: FileBrowser[] = [];
    // One request per page. MaxKeys caps CommonPrefixes + Contents together,
    // which is exactly the combined limit the contract promises, so the page
    // boundary needs no adjusting here.
    //
    // Previously this drained every continuation token before returning, so a
    // folder with 50,000 objects cost 50 round trips and one enormous payload.
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: config.bucket,
        // A name-prefix search rides on the same key prefix the folder listing
        // already uses — free on S3, and the Delimiter keeps it one level.
        Prefix: options?.prefix ? `${prefix}${options.prefix}` : prefix,
        Delimiter: '/',
        ...(options?.limit ? { MaxKeys: options.limit } : {}),
        ...(options?.cursor ? { ContinuationToken: options.cursor } : {})
      })
    );
    // Folders only travel with the FIRST page — see ListResult.folders. A
    // later page would be re-sending what the caller already has, and on
    // Azure the paged segment genuinely repeats prefixes it still overlaps.
    if (!options?.cursor) {
      (response.CommonPrefixes || []).forEach((commonPrefix) => {
        const name = (commonPrefix.Prefix || '')
          .slice(prefix.length)
          .replace(/\/$/, '');
        if (name && !folders.includes(name)) {
          folders.push(name);
        }
      });
    }
    (response.Contents || []).forEach((object) => {
      // The zero-byte `{prefix}/` object is the folder marker, not a file.
      // Filter it by key — not by size, which would hide genuine empty files.
      if (!object.Key || object.Key === prefix) {
        return;
      }
      const name = object.Key.split('/').pop() as string;
      files.push({
        name,
        url: buildObjectUrl(config, object.Key, region),
        // Already in the listing response — no extra request.
        ...(typeof object.Size === 'number' ? { size: object.Size } : {}),
        mimeType: mimeFor(name)
      });
    });
    const nextCursor =
      response.IsTruncated && response.NextContinuationToken
        ? response.NextContinuationToken
        : undefined;

    // Folders must arrive complete with the first page, but S3 interleaves
    // CommonPrefixes with Contents and has no folders-only listing. Keep
    // scanning past the file page, collecting prefixes and discarding the
    // objects. Bounded — see folderScan.ts.
    if (!options?.cursor && nextCursor) {
      let token: string | undefined = nextCursor;
      let scans = 0;
      while (token && scans < MAX_FOLDER_SCAN_REQUESTS) {
        scans += 1;
        const more = await client.send(
          new ListObjectsV2Command({
            Bucket: config.bucket,
            Prefix: options?.prefix ? `${prefix}${options.prefix}` : prefix,
            Delimiter: '/',
            MaxKeys: FOLDER_SCAN_PAGE_SIZE,
            ContinuationToken: token
          })
        );
        (more.CommonPrefixes || []).forEach((commonPrefix) => {
          const name = (commonPrefix.Prefix || '')
            .slice(prefix.length)
            .replace(/\/$/, '');
          if (name && !folders.includes(name)) {
            folders.push(name);
          }
        });
        token = more.IsTruncated ? more.NextContinuationToken : undefined;
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

export const s3FileDeleter: FileDeleterProvider = {
  delete: async (path: string): Promise<void> => {
    const key = buildKey(path);
    if (!key) {
      throw new Error('Requested path is empty');
    }
    const { client, config } = await getS3Client();
    // DeleteObject is idempotent (204 whether or not the key existed) — no
    // Head precheck: it costs a round trip and reports 403 instead of 404
    // without s3:ListBucket.
    await client.send(
      new DeleteObjectCommand({ Bucket: config.bucket, Key: key })
    );
  }
};

export const s3FolderCreator: FolderCreatorProvider = {
  create: async (destinationPath: string): Promise<string> => {
    const key = buildKey(destinationPath);
    if (!key) {
      throw new Error('Requested path is empty');
    }
    const { client, config } = await getS3Client();
    // Zero-byte `{key}/` object — the same folder-marker convention the AWS
    // console uses; the browser groups it into CommonPrefixes.
    await client.send(
      new PutObjectCommand({ Bucket: config.bucket, Key: `${key}/`, Body: '' })
    );
    return key;
  }
};

export const s3FileRenamer: FileRenamerProvider = {
  rename: async (fromPath: string, toPath: string): Promise<void> => {
    const { client, config } = await getS3Client();
    const fromKey = buildKey(fromPath);
    const toKey = buildKey(toPath);
    if (!fromKey || !toKey) {
      throw new Error('Requested path is empty');
    }
    if (fromKey === toKey) {
      return;
    }
    // S3 has no rename. Copy, confirm, then delete — and refuse if the target
    // key is taken, because CopyObject overwrites without complaint and a
    // media folder is shared.
    try {
      await client.send(
        new HeadObjectCommand({ Bucket: config.bucket, Key: toKey })
      );
      throw new Error('A file with that name already exists');
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } })
        ?.$metadata?.httpStatusCode;
      // 404 is the answer we want: nothing is there. Anything else — including
      // the 403 a bucket without s3:ListBucket returns for a missing key — is
      // not proof the name is free, so do not proceed.
      if (
        (error as Error)?.message === 'A file with that name already exists'
      ) {
        throw error;
      }
      if (status !== 404) {
        throw error;
      }
    }
    await client.send(
      new CopyObjectCommand({
        Bucket: config.bucket,
        CopySource: `${config.bucket}/${fromKey}`,
        Key: toKey
      })
    );
    // Only after the copy is acknowledged. An interruption before this point
    // leaves the original untouched, which is the safe direction to fail.
    await client.send(
      new DeleteObjectCommand({ Bucket: config.bucket, Key: fromKey })
    );
  }
};
