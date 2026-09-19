import { jest, describe, it, expect, beforeEach } from '@jest/globals';

/* Fake Azure SDK: one container client recording calls; the hierarchy
   listing yields a scripted item sequence. */
const createIfNotExistsCalls: any[] = [];
let createIfNotExistsFailures = 0;
const uploadDataCalls: any[] = [];
let deleteIfExistsResults: Array<{ succeeded: boolean }> = [];
const deleteIfExistsCalls: string[] = [];
let hierarchyItems: any[] = [];
let hierarchyOptions: any = null;

const encode = (name: string) =>
  name.split('/').map(encodeURIComponent).join('/');

const containerClient = {
  createIfNotExists: async (options: any) => {
    createIfNotExistsCalls.push(options);
    if (createIfNotExistsFailures > 0) {
      createIfNotExistsFailures -= 1;
      throw new Error('PublicAccessNotPermitted');
    }
    return {};
  },
  getBlockBlobClient: (name: string) => ({
    url: `https://acct.blob.core.windows.net/images/${encode(name)}`,
    uploadData: async (buffer: Buffer, options: any) => {
      uploadDataCalls.push({ name, buffer, options });
    }
  }),
  getBlobClient: (name: string) => ({
    url: `https://acct.blob.core.windows.net/images/${encode(name)}`,
    deleteIfExists: async () => {
      deleteIfExistsCalls.push(name);
      return deleteIfExistsResults.shift() || { succeeded: true };
    }
  }),
  listBlobsByHierarchy: (delimiter: string, options: any) => {
    hierarchyOptions = { delimiter, options };
    return (async function* generate() {
      for (const item of hierarchyItems) {
        yield item;
      }
    })();
  }
};

const fromConnectionString = jest.fn(() => ({
  getContainerClient: () => containerClient
}));
jest.unstable_mockModule('@azure/storage-blob', () => ({
  BlobServiceClient: { fromConnectionString }
}));

let azureConfig: any = {};
jest.unstable_mockModule('../../storageConfig.js', () => ({
  getAzureStorageConfig: async () => azureConfig
}));

const warning = jest.fn();
jest.unstable_mockModule('../../../../../../lib/log/logger.js', () => ({
  warning,
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  success: jest.fn()
}));

const {
  azureFileUploader,
  azureFileBrowser,
  azureFileDeleter,
  azureFolderCreator
} = await import('../../azure/azureStorage.js');

const file = (filename: string): any => ({
  filename,
  mimetype: 'image/webp',
  size: 7,
  buffer: Buffer.from('x')
});

/* Distinct connection string per config so the client cache in azureClient
   never leaks container-ensure state between test cases. */
let connectionCounter = 0;
const makeConfig = (overrides: Record<string, unknown> = {}) => {
  connectionCounter += 1;
  return {
    connectionString: `DefaultEndpointsProtocol=https;AccountName=acct${connectionCounter};AccountKey=a=b=;EndpointSuffix=core.windows.net`,
    containerName: 'images',
    containerAccess: 'private',
    ...overrides
  };
};

describe('azureStorage', () => {
  beforeEach(() => {
    createIfNotExistsCalls.length = 0;
    createIfNotExistsFailures = 0;
    uploadDataCalls.length = 0;
    deleteIfExistsCalls.length = 0;
    deleteIfExistsResults = [];
    hierarchyItems = [];
    hierarchyOptions = null;
    warning.mockClear();
    azureConfig = makeConfig();
  });

  it('ensures the container once (private) across multiple operations', async () => {
    await azureFileUploader.upload([file('a.webp')], 'x');
    await azureFileDeleter.delete('x/a.webp');
    await azureFileBrowser.list('');
    expect(createIfNotExistsCalls).toEqual([{}]);
  });

  it('passes the public access level only when configured', async () => {
    azureConfig = makeConfig({ containerAccess: 'blob' });
    await azureFileUploader.upload([file('a.webp')], '');
    expect(createIfNotExistsCalls).toEqual([{ access: 'blob' }]);
  });

  it('retries the container ensure after a failure instead of caching it', async () => {
    createIfNotExistsFailures = 1;
    await expect(azureFileUploader.upload([file('a.webp')], '')).rejects.toThrow(
      'PublicAccessNotPermitted'
    );
    await expect(
      azureFileUploader.upload([file('a.webp')], '')
    ).resolves.toHaveLength(1);
    expect(createIfNotExistsCalls).toHaveLength(2);
  });

  it('uploads with blobContentType and returns the SDK-encoded blob URL', async () => {
    const results = await azureFileUploader.upload(
      [file('cat.webp')],
      'catalog/my folder'
    );
    expect(uploadDataCalls[0]).toMatchObject({
      name: 'catalog/my folder/cat.webp',
      options: { blobHTTPHeaders: { blobContentType: 'image/webp' } }
    });
    expect(results[0].url).toBe(
      'https://acct.blob.core.windows.net/images/catalog/my%20folder/cat.webp'
    );
  });

  it('prefers the configured base URL (CDN) for file URLs', async () => {
    azureConfig = makeConfig({ baseUrl: 'https://cdn.example.com/' });
    const results = await azureFileUploader.upload([file('a b.webp')], 'x');
    expect(results[0].url).toBe('https://cdn.example.com/x/a%20b.webp');
  });

  it('lists one hierarchy level: virtual folders, files, marker excluded, empty files kept', async () => {
    hierarchyItems = [
      { kind: 'prefix', name: 'catalog/sub1/' },
      { kind: 'blob', name: 'catalog/', properties: { contentLength: 0 } },
      { kind: 'blob', name: 'catalog/one.webp', properties: { contentLength: 5 } },
      { kind: 'blob', name: 'catalog/empty.txt', properties: { contentLength: 0 } }
    ];
    const { files, folders } = await azureFileBrowser.list('catalog');
    expect(hierarchyOptions).toEqual({
      delimiter: '/',
      options: { prefix: 'catalog/' }
    });
    expect(folders).toEqual(['sub1']);
    expect(files.map((f) => f.name)).toEqual(['one.webp', 'empty.txt']);
    expect(files[0].url).toBe(
      'https://acct.blob.core.windows.net/images/catalog/one.webp'
    );
  });

  it('treats deleting a missing blob as a successful no-op with a warning', async () => {
    deleteIfExistsResults = [{ succeeded: false }];
    await expect(azureFileDeleter.delete('gone.webp')).resolves.toBeUndefined();
    expect(deleteIfExistsCalls).toEqual(['gone.webp']);
    expect(warning).toHaveBeenCalledWith(
      expect.stringContaining('gone.webp')
    );
  });

  it('creates a zero-byte folder marker and returns the normalized path', async () => {
    const created = await azureFolderCreator.create('/new folder//');
    expect(created).toBe('new folder');
    expect(uploadDataCalls[0].name).toBe('new folder/');
    expect(uploadDataCalls[0].buffer).toHaveLength(0);
  });
});
