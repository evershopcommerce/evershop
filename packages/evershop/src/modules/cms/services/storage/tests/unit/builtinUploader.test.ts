import {
  builtinUploaderFor,
  uploadFile
} from '../../../uploadFile.js';
import { azureFileUploader } from '../../azure/azureStorage.js';
import { gcsFileUploader } from '../../gcs/gcsStorage.js';
import { s3FileUploader } from '../../s3/s3Storage.js';

describe('builtinUploaderFor', () => {
  // The registry's fileUploader processors stay authoritative in a
  // bootstrapped app; this dispatch is the DEFAULT for registry-less
  // contexts (the seed CLI). The previous default was "always local",
  // which silently ignored a configured cloud provider: seeded product
  // images landed on the ephemeral pod filesystem of S3-configured
  // stores while admin uploads went to the bucket.
  it('routes each provider id to its built-in uploader', () => {
    expect(builtinUploaderFor('s3')).toBe(s3FileUploader);
    expect(builtinUploaderFor('azure')).toBe(azureFileUploader);
    expect(builtinUploaderFor('gcs')).toBe(gcsFileUploader);
  });

  it('falls back to the local uploader for local or unknown providers', () => {
    const local = builtinUploaderFor('local');
    expect(typeof local.upload).toBe('function');
    expect(builtinUploaderFor('anything-else')).toBe(local);
    expect(builtinUploaderFor('')).toBe(local);
  });

  it('every built-in uploader satisfies the provider contract', () => {
    for (const provider of ['s3', 'azure', 'gcs', 'local']) {
      expect(typeof builtinUploaderFor(provider).upload).toBe('function');
    }
  });

  it('uploadFile is exported alongside (the consumer the seed CLI uses)', () => {
    expect(typeof uploadFile).toBe('function');
  });
});
