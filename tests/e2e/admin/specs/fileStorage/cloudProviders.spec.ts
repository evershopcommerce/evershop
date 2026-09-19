import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  expect,
  test,
  type APIRequestContext,
  type PlaywrightWorkerArgs
} from '@playwright/test';

/**
 * Cloud file-storage providers (S3 / S3-compatible / Azure) end-to-end —
 * upload → browse → folder → delete against a REAL bucket/container through
 * the admin file APIs (see wiki/file-storage-design.md).
 *
 * Env-gated: without credentials both suites skip. To run, add to
 * tests/e2e/.env:
 *
 *   E2E_S3_BUCKET=…            required to enable the S3 suite
 *   E2E_S3_REGION=…            optional (SDK default chain applies)
 *   E2E_S3_ACCESS_KEY_ID=…     optional (IAM role / env chain applies)
 *   E2E_S3_SECRET_ACCESS_KEY=… optional
 *   E2E_S3_ENDPOINT=…          optional — Hetzner/R2/MinIO/Spaces
 *   E2E_S3_FORCE_PATH_STYLE=1  optional — MinIO
 *   E2E_S3_BASE_URL=…          optional — CDN in front of the bucket
 *   E2E_S3_PUBLIC_READ=1       optional — objects are publicly readable;
 *                              enables the /images proxy assertion
 *
 *   E2E_AZURE_CONNECTION_STRING=… required to enable the Azure suite
 *   E2E_AZURE_CONTAINER=…         optional (defaults to "images")
 *   E2E_AZURE_PUBLIC_READ=1       optional — see above
 *
 * The provider is configured through the real saveSetting API — which
 * refreshes the server's in-memory settings cache; a direct DB write would
 * NOT — and restored to local storage afterwards. Switching is a runtime
 * operation: no server restart happens anywhere in this spec.
 *
 * Residue: virtual-folder markers (`<folder>/` zero-byte objects) cannot be
 * deleted through the file API (there is no folder-delete endpoint — local
 * parity), so each run leaves one marker object under a unique
 * `e2e-storage-*` prefix in the test bucket. Use a disposable bucket.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const AUTH_STATE = path.join(__dirname, '..', '..', '..', '.auth', 'admin.json');

// 1x1 transparent PNG — a genuinely valid image so the imageUpload
// verification middleware accepts it.
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

interface ProviderCase {
  title: string;
  enabled: boolean;
  skipReason: string;
  /** Posted to saveSetting before the suite runs */
  settings: Record<string, string>;
  /** Posted to saveSetting after the suite (restores local storage) */
  resetSettings: Record<string, string>;
  /** Objects are anonymously readable — enables the /images proxy check */
  publicRead: boolean;
}

const S3_KEYS = [
  's3Bucket',
  's3Region',
  's3AccessKeyId',
  's3SecretAccessKey',
  's3Endpoint',
  's3ForcePathStyle',
  's3BaseUrl'
];
const AZURE_KEYS = [
  'azureStorageConnectionString',
  'azureStorageContainerName',
  'azureContainerAccess',
  'azureBaseUrl'
];
const GCS_KEYS = ['gcsBucket', 'gcsServiceAccountKey', 'gcsBaseUrl'];

const blank = (keys: string[]): Record<string, string> =>
  Object.fromEntries(keys.map((key) => [key, '']));

const providerCases: ProviderCase[] = [
  {
    title: 'S3',
    enabled: Boolean(process.env.E2E_S3_BUCKET),
    skipReason: 'E2E_S3_BUCKET not set — skipping the S3 storage suite',
    settings: {
      fileStorage: 's3',
      s3Bucket: process.env.E2E_S3_BUCKET ?? '',
      s3Region: process.env.E2E_S3_REGION ?? '',
      s3AccessKeyId: process.env.E2E_S3_ACCESS_KEY_ID ?? '',
      s3SecretAccessKey: process.env.E2E_S3_SECRET_ACCESS_KEY ?? '',
      s3Endpoint: process.env.E2E_S3_ENDPOINT ?? '',
      s3ForcePathStyle: process.env.E2E_S3_FORCE_PATH_STYLE ?? '',
      s3BaseUrl: process.env.E2E_S3_BASE_URL ?? ''
    },
    resetSettings: { fileStorage: 'local', ...blank(S3_KEYS) },
    publicRead: Boolean(process.env.E2E_S3_PUBLIC_READ)
  },
  {
    title: 'Azure Blob Storage',
    enabled: Boolean(process.env.E2E_AZURE_CONNECTION_STRING),
    skipReason:
      'E2E_AZURE_CONNECTION_STRING not set — skipping the Azure storage suite',
    settings: {
      fileStorage: 'azure',
      azureStorageConnectionString:
        process.env.E2E_AZURE_CONNECTION_STRING ?? '',
      azureStorageContainerName: process.env.E2E_AZURE_CONTAINER ?? '',
      azureContainerAccess: process.env.E2E_AZURE_PUBLIC_READ ? 'blob' : '',
      azureBaseUrl: ''
    },
    resetSettings: { fileStorage: 'local', ...blank(AZURE_KEYS) },
    publicRead: Boolean(process.env.E2E_AZURE_PUBLIC_READ)
  },
  {
    title: 'Google Cloud Storage',
    enabled: Boolean(process.env.E2E_GCS_BUCKET),
    skipReason: 'E2E_GCS_BUCKET not set — skipping the GCS storage suite',
    settings: {
      fileStorage: 'gcs',
      gcsBucket: process.env.E2E_GCS_BUCKET ?? '',
      gcsServiceAccountKey: process.env.E2E_GCS_SERVICE_ACCOUNT_KEY ?? '',
      gcsBaseUrl: process.env.E2E_GCS_BASE_URL ?? ''
    },
    resetSettings: { fileStorage: 'local', ...blank(GCS_KEYS) },
    publicRead: Boolean(process.env.E2E_GCS_PUBLIC_READ)
  }
];

/** Dedicated context for beforeAll/afterAll (test-scoped `request` is not
 *  available there). Reuses the globalSetup admin session. */
const apiContext = (
  playwright: PlaywrightWorkerArgs['playwright']
): Promise<APIRequestContext> =>
  playwright.request.newContext({
    baseURL: BASE_URL,
    storageState: AUTH_STATE
  });

const saveSettings = async (
  api: APIRequestContext,
  settings: Record<string, string>
): Promise<void> => {
  const response = await api.post('/api/settings', { data: settings });
  if (!response.ok()) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `saveSetting failed (${response.status()}): ${body.substring(0, 300)}`
    );
  }
};

for (const providerCase of providerCases) {
  test.describe(`admin / file storage on ${providerCase.title}`, () => {
    test.skip(!providerCase.enabled, providerCase.skipReason);
    test.describe.configure({ mode: 'serial' });

    const folder = `e2e-storage-${randomUUID().slice(0, 8)}`;
    const imageName = `img-${randomUUID().slice(0, 8)}.png`;
    let uploadedUrl = '';

    test.beforeAll(async ({ playwright }) => {
      const api = await apiContext(playwright);
      await saveSettings(api, providerCase.settings);
      await api.dispose();
    });

    test.afterAll(async ({ playwright }) => {
      const api = await apiContext(playwright);
      await saveSettings(api, providerCase.resetSettings);
      await api.dispose();
    });

    test('uploads an image and returns an absolute cloud URL', async ({
      request
    }) => {
      const response = await request.post(`/api/images/${folder}`, {
        multipart: {
          images: { name: imageName, mimeType: 'image/png', buffer: PNG_1PX }
        }
      });
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.data.files).toHaveLength(1);
      const uploaded = body.data.files[0];
      expect(uploaded.name).toBe(imageName);
      // Cloud URLs are absolute; the local provider returns `/assets/…`.
      expect(uploaded.url).toMatch(/^https?:\/\//);
      uploadedUrl = uploaded.url;
    });

    test('lists the uploaded file when browsing the folder', async ({
      request
    }) => {
      const response = await request.get(`/api/files/${folder}`);
      expect(response.status()).toBe(200);
      const body = await response.json();
      const names = body.data.files.map((file: { name: string }) => file.name);
      expect(names).toContain(imageName);
    });

    test('creates a virtual subfolder', async ({ request }) => {
      const createResponse = await request.post('/api/folders', {
        data: { path: `${folder}/sub` }
      });
      expect(createResponse.status()).toBe(200);
      const browseResponse = await request.get(`/api/files/${folder}`);
      const body = await browseResponse.json();
      expect(body.data.folders).toContain('sub');
    });

    test('serves the stored image through the /images proxy (auto-allowlisted host)', async ({
      request
    }) => {
      test.skip(
        !providerCase.publicRead,
        'objects are not publicly readable — set E2E_*_PUBLIC_READ=1 to assert the proxy path'
      );
      // Exercises the whole chain: the stored absolute URL, anonymous read
      // on the bucket/container, AND the image-host allowlist derived from
      // the active storage settings (no IMAGE_ALLOWED_HOSTS involved).
      const response = await request.get(
        `/images?src=${encodeURIComponent(uploadedUrl)}&w=32`
      );
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toMatch(/^image\//);
    });

    test('deletes the file, and a repeat delete is a successful no-op', async ({
      request
    }) => {
      const deleteResponse = await request.delete(
        `/api/files/${folder}/${imageName}`
      );
      expect(deleteResponse.status()).toBe(200);

      const browseResponse = await request.get(`/api/files/${folder}`);
      const body = await browseResponse.json();
      const names = body.data.files.map((file: { name: string }) => file.name);
      expect(names).not.toContain(imageName);

      // Idempotent delete: the goal state is already true — 200, not 500.
      const repeatResponse = await request.delete(
        `/api/files/${folder}/${imageName}`
      );
      expect(repeatResponse.status()).toBe(200);
    });
  });
}
