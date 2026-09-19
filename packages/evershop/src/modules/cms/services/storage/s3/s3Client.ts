import { S3Client } from '@aws-sdk/client-s3';
import {
  getS3StorageConfig,
  S3StorageConfig,
  setResolvedS3Region
} from '../storageConfig.js';

let cached: { cacheKey: string; client: S3Client } | undefined;

/**
 * Client factory reading the live configuration on every call — the client is
 * rebuilt when any connection-relevant value changes (a settings save applies
 * without restart) and reused otherwise. Credentials are only passed
 * explicitly when configured; otherwise the SDK default provider chain
 * applies (env vars, shared config, IAM roles).
 */
export async function getS3Client(): Promise<{
  client: S3Client;
  config: S3StorageConfig;
}> {
  const config = await getS3StorageConfig();
  const cacheKey = JSON.stringify([
    config.region,
    config.accessKeyId,
    config.secretAccessKey,
    config.endpoint,
    config.forcePathStyle
  ]);
  if (!cached || cached.cacheKey !== cacheKey) {
    cached = {
      cacheKey,
      client: new S3Client({
        ...(config.region ? { region: config.region } : {}),
        // S3-compatible services (Hetzner, R2, MinIO, …) commonly reject the
        // data-integrity checksums newer SDKs send by default on uploads
        // (x-amz-checksum-crc32, SDK >= 3.729.0) — only compute them when an
        // operation requires one. Real AWS (no custom endpoint) keeps the
        // full default protections.
        ...(config.endpoint
          ? {
              endpoint: config.endpoint,
              requestChecksumCalculation: 'WHEN_REQUIRED' as const,
              responseChecksumValidation: 'WHEN_REQUIRED' as const
            }
          : {}),
        ...(config.forcePathStyle ? { forcePathStyle: true } : {}),
        ...(config.accessKeyId && config.secretAccessKey
          ? {
              credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey
              }
            }
          : {})
      })
    };
  }
  return { client: cached.client, config };
}

/**
 * Resolve the region the client actually uses (explicit config or the SDK
 * provider chain — env, shared config, IMDS). Needed to build
 * virtual-hosted-style URLs, and cached into storageConfig so the image-host
 * allowlist can see chain-resolved regions too.
 */
export async function resolveS3Region(client: S3Client): Promise<string> {
  const region = await client.config.region();
  setResolvedS3Region(region);
  return region;
}
