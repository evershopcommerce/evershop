import { Bucket, Storage } from '@google-cloud/storage';
import { GcsStorageConfig, getGcsStorageConfig } from '../storageConfig.js';

let cached: { cacheKey: string; storage: Storage } | undefined;

/**
 * Parse the pasted service-account key file content. Throws a readable error
 * for malformed input — surfaced by the save-time connection check.
 */
export function parseServiceAccountKey(serviceAccountKey: string): {
  projectId?: string;
  credentials: { client_email: string; private_key: string };
} {
  let parsed: {
    project_id?: string;
    client_email?: string;
    private_key?: string;
  };
  try {
    parsed = JSON.parse(serviceAccountKey);
  } catch {
    throw new Error(
      'The service account key is not valid JSON — paste the entire content of the downloaded key file.'
    );
  }
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error(
      'The service account key is missing "client_email" or "private_key" — paste the entire content of the downloaded key file.'
    );
  }
  return {
    projectId: parsed.project_id,
    credentials: {
      client_email: parsed.client_email,
      private_key: parsed.private_key
    }
  };
}

/**
 * Client factory reading the live configuration on every call — rebuilt when
 * the service-account key changes (a settings save applies without restart),
 * reused otherwise. Without an explicit key, Application Default Credentials
 * apply (attached service account, GOOGLE_APPLICATION_CREDENTIALS) — the
 * Google-recommended setup on GCP.
 */
export async function getGcsBucket(): Promise<{
  bucket: Bucket;
  config: GcsStorageConfig;
}> {
  const config = await getGcsStorageConfig();
  const cacheKey = JSON.stringify([config.serviceAccountKey]);
  if (!cached || cached.cacheKey !== cacheKey) {
    cached = {
      cacheKey,
      storage: config.serviceAccountKey
        ? new Storage(parseServiceAccountKey(config.serviceAccountKey))
        : new Storage()
    };
  }
  return { bucket: cached.storage.bucket(config.bucket), config };
}
