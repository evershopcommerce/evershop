import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { BlobServiceClient } from '@azure/storage-blob';
import { Storage } from '@google-cloud/storage';
import { parseServiceAccountKey } from './gcs/gcsClient.js';
import { getFileStorageConfigOverrides } from './storageConfig.js';

/**
 * Live connection checks used to gate the System Setting save: when the form
 * switches to (or updates) a cloud provider, the submitted values must reach
 * the actual bucket/container or the save is rejected. Each check is a single
 * attempt with tight timeouts — this runs inside a request.
 *
 * Returns a merchant-readable failure message, or null when the connection
 * works.
 */

const describeS3Error = (e: unknown): string => {
  const err = e as {
    name?: string;
    message?: string;
    $metadata?: { httpStatusCode?: number };
  };
  const status = err?.$metadata?.httpStatusCode;
  if (err?.name === 'NotFound' || status === 404) {
    return 'the bucket was not found — check the bucket name and region';
  }
  if (err?.name === 'PermanentRedirect' || status === 301) {
    return 'the bucket exists but in a different region — check the region';
  }
  if (err?.name === 'Forbidden' || status === 403) {
    return 'access was denied — check the access key and secret';
  }
  const detail = [err?.name, err?.message]
    .filter((part) => part && part !== 'UnknownError')
    .join(': ');
  return detail || 'the storage service could not be reached';
};

export interface S3ConnectionCandidate {
  bucket?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
  forcePathStyle?: boolean;
}

export async function verifyS3Connection(
  candidate: S3ConnectionCandidate
): Promise<string | null> {
  if (!candidate.bucket) {
    return 'A bucket name is required for S3 file storage.';
  }
  const client = new S3Client({
    maxAttempts: 1,
    requestHandler: { connectionTimeout: 5000, requestTimeout: 10000 },
    ...(candidate.region ? { region: candidate.region } : {}),
    ...(candidate.endpoint ? { endpoint: candidate.endpoint } : {}),
    ...(candidate.forcePathStyle ? { forcePathStyle: true } : {}),
    ...(candidate.accessKeyId && candidate.secretAccessKey
      ? {
          credentials: {
            accessKeyId: candidate.accessKeyId,
            secretAccessKey: candidate.secretAccessKey
          }
        }
      : {})
  });
  try {
    await client.send(new HeadBucketCommand({ Bucket: candidate.bucket }));
    return null;
  } catch (e) {
    return `Could not connect to the S3 bucket "${candidate.bucket}": ${describeS3Error(
      e
    )}.`;
  } finally {
    client.destroy();
  }
}

const describeAzureError = (e: unknown): string => {
  const err = e as { statusCode?: number; code?: string; message?: string };
  if (err?.statusCode === 403 || err?.code === 'AuthenticationFailed') {
    return 'authentication failed — check the connection string';
  }
  const message = (err?.message || '').split('\n')[0].trim();
  return message || 'the storage service could not be reached';
};

export interface AzureConnectionCandidate {
  connectionString?: string;
}

export async function verifyAzureConnection(
  candidate: AzureConnectionCandidate
): Promise<string | null> {
  if (!candidate.connectionString) {
    return 'A connection string is required for Azure file storage.';
  }
  try {
    // fromConnectionString throws synchronously on malformed input
    const serviceClient = BlobServiceClient.fromConnectionString(
      candidate.connectionString,
      { retryOptions: { maxTries: 1, tryTimeoutInMs: 10000 } }
    );
    // Account-level signed request: verifies the endpoint and credentials.
    // The container itself may not exist yet — it is created on first use.
    await serviceClient.getProperties({
      abortSignal: AbortSignal.timeout(10000)
    });
    return null;
  } catch (e) {
    return `Could not connect to Azure Blob Storage: ${describeAzureError(e)}.`;
  }
}

const describeGcsError = (e: unknown): string => {
  const err = e as { code?: number; message?: string };
  if (err?.code === 404) {
    return 'the bucket was not found — check the bucket name';
  }
  if (err?.code === 403) {
    return 'access was denied — grant the service account the Storage Object Admin role on the bucket';
  }
  const message = (err?.message || '').split('\n')[0].trim();
  return message || 'the storage service could not be reached';
};

export interface GcsConnectionCandidate {
  bucket?: string;
  serviceAccountKey?: string;
}

export async function verifyGcsConnection(
  candidate: GcsConnectionCandidate
): Promise<string | null> {
  if (!candidate.bucket) {
    return 'A bucket name is required for Google Cloud file storage.';
  }
  try {
    // parseServiceAccountKey throws a readable message on malformed input
    const storage = candidate.serviceAccountKey
      ? new Storage({
          ...parseServiceAccountKey(candidate.serviceAccountKey),
          retryOptions: { autoRetry: false }
        })
      : new Storage({ retryOptions: { autoRetry: false } });
    // Minimal-permission probe: listing one object needs only
    // storage.objects.list (Object Viewer/Admin) — no bucket-level get.
    await Promise.race([
      storage
        .bucket(candidate.bucket)
        .getFiles({ maxResults: 1, autoPaginate: false }),
      new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error('the storage service did not respond')),
          10000
        ).unref();
      })
    ]);
    return null;
  } catch (e) {
    return `Could not connect to the Google Cloud bucket "${candidate.bucket}": ${describeGcsError(
      e
    )}.`;
  }
}

const candidateValue = (
  overrides: Record<string, string>,
  body: Record<string, unknown>,
  key: string
): string | undefined => {
  if (key in overrides) {
    return overrides[key];
  }
  const value = body[key];
  return typeof value === 'string' && value.trim() !== ''
    ? value.trim()
    : undefined;
};

const toBoolean = (value: unknown): boolean =>
  ['1', 'true', 'yes'].includes(String(value ?? '').trim().toLowerCase());

/**
 * Validate a saveSetting payload that switches to (or updates) a cloud file
 * storage provider. Candidate values mirror the runtime resolution: config/env
 * overrides win, then the submitted values. Returns a failure message to
 * reject the save with, or null to let it through (including when the payload
 * doesn't touch cloud storage at all).
 */
export async function validateFileStorageSave(
  body: Record<string, unknown>
): Promise<string | null> {
  const provider = body?.fileStorage;
  if (provider !== 's3' && provider !== 'azure' && provider !== 'gcs') {
    return null;
  }
  const overrides = getFileStorageConfigOverrides();
  if (provider === 'gcs') {
    return verifyGcsConnection({
      bucket: candidateValue(overrides, body, 'gcsBucket'),
      serviceAccountKey: candidateValue(
        overrides,
        body,
        'gcsServiceAccountKey'
      )
    });
  }
  if (provider === 's3') {
    return verifyS3Connection({
      bucket: candidateValue(overrides, body, 's3Bucket'),
      region: candidateValue(overrides, body, 's3Region'),
      accessKeyId: candidateValue(overrides, body, 's3AccessKeyId'),
      secretAccessKey: candidateValue(overrides, body, 's3SecretAccessKey'),
      endpoint: candidateValue(overrides, body, 's3Endpoint'),
      forcePathStyle: toBoolean(
        's3ForcePathStyle' in overrides
          ? overrides.s3ForcePathStyle
          : body.s3ForcePathStyle
      )
    });
  }
  return verifyAzureConnection({
    connectionString: candidateValue(
      overrides,
      body,
      'azureStorageConnectionString'
    )
  });
}
