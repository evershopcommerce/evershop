import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand
} from '@aws-sdk/client-s3';
import type { FileBrowser } from '../../browFiles.js';
import type { UploadedFile } from '../../uploadFile.js';
import { buildKey, encodeKeyForUrl, trimTrailingSlash } from '../buildKey.js';
import type { S3StorageConfig } from '../storageConfig.js';
import type {
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
    return `${trimTrailingSlash(config.endpoint)}/${config.bucket}/${encodedKey}`;
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
  list: async (
    path: string
  ): Promise<{ files: FileBrowser[]; folders: string[] }> => {
    const { client, config } = await getS3Client();
    const region = needsRegion(config)
      ? await resolveS3Region(client)
      : undefined;
    const key = buildKey(path);
    const prefix = key ? `${key}/` : '';
    const folders: string[] = [];
    const files: FileBrowser[] = [];
    // ListObjectsV2 returns at most 1,000 entries per request (CommonPrefixes
    // count toward the cap) — loop on the continuation token or big media
    // folders silently truncate.
    let continuationToken: string | undefined;
    do {
      const response = await client.send(
        new ListObjectsV2Command({
          Bucket: config.bucket,
          Prefix: prefix,
          Delimiter: '/',
          ...(continuationToken
            ? { ContinuationToken: continuationToken }
            : {})
        })
      );
      (response.CommonPrefixes || []).forEach((commonPrefix) => {
        const name = (commonPrefix.Prefix || '')
          .slice(prefix.length)
          .replace(/\/$/, '');
        if (name) {
          folders.push(name);
        }
      });
      (response.Contents || []).forEach((object) => {
        // The zero-byte `{prefix}/` object is the folder marker, not a file.
        // Filter it by key — not by size, which would hide genuine empty files.
        if (!object.Key || object.Key === prefix) {
          return;
        }
        files.push({
          name: object.Key.split('/').pop() as string,
          url: buildObjectUrl(config, object.Key, region)
        });
      });
      continuationToken = response.IsTruncated
        ? response.NextContinuationToken
        : undefined;
    } while (continuationToken);
    return { files, folders };
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
