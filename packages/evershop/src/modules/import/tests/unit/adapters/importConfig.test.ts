import config from 'config';
import { afterEach, beforeAll, describe, expect, it } from '@jest/globals';

/**
 * `system.import.*` read from the configuration with a default. The settings are
 * set in the loaded configuration, as the other tests of core do.
 */
process.env.ALLOW_CONFIG_MUTATIONS = 'true';

const {
  fileLimits,
  importFlag,
  importSetting,
  maxFileBytes,
  maxWorkersPerInstance,
  retentionMs,
  workerMemoryMb
} = await import('../../../adapters/importConfig.js');

const set = (values: Record<string, unknown>) => {
  (config as unknown as { util: { extendDeep: Function } }).util.extendDeep(
    config,
    { system: { import: values } }
  );
};

beforeAll(() => {
  set({});
});

afterEach(() => {
  set({
    maxFileSizeMb: undefined,
    retentionDays: undefined,
    maxRows: undefined,
    maxCellLength: undefined,
    maxIssues: undefined,
    allowPrivateNetworks: undefined,
    imageTimeoutSeconds: undefined,
    maxWorkersPerInstance: undefined,
    workerMemoryMb: undefined
  });
});

describe('importSetting', () => {
  it('gives the default when the key is not set', () => {
    expect(importSetting('imageTimeoutSeconds', 30)).toBe(30);
  });

  it('gives the value that is set, also a fraction', () => {
    set({ imageTimeoutSeconds: 12.5 });
    expect(importSetting('imageTimeoutSeconds', 30)).toBe(12.5);
  });

  it('reads a number that was written as text', () => {
    set({ imageTimeoutSeconds: '45' });
    expect(importSetting('imageTimeoutSeconds', 30)).toBe(45);
  });

  it.each([[0], [-5], ['many'], [null], [Infinity], [NaN]])(
    'gives the default for %j: a limit must be a positive number',
    (value) => {
      set({ imageTimeoutSeconds: value });
      expect(importSetting('imageTimeoutSeconds', 30)).toBe(30);
    }
  );
});

describe('importFlag', () => {
  it('is off unless it is set to true', () => {
    expect(importFlag('allowPrivateNetworks')).toBe(false);
    set({ allowPrivateNetworks: 'true' });
    expect(importFlag('allowPrivateNetworks')).toBe(false);
    set({ allowPrivateNetworks: 1 });
    expect(importFlag('allowPrivateNetworks')).toBe(false);
    set({ allowPrivateNetworks: true });
    expect(importFlag('allowPrivateNetworks')).toBe(true);
  });
});

describe('the settings of § 8.7', () => {
  it('has the defaults of the spec', () => {
    expect(maxFileBytes()).toBe(100 * 1_048_576);
    expect(retentionMs()).toBe(7 * 86_400_000);
    expect(fileLimits()).toEqual({
      maxRows: 200_000,
      maxCellLength: 65_536,
      maxIssues: 100_000
    });
    expect(maxWorkersPerInstance()).toBe(2);
    expect(workerMemoryMb()).toBe(1024);
  });

  it('follows the configuration', () => {
    set({
      maxFileSizeMb: 5,
      retentionDays: 2,
      maxRows: 10,
      maxCellLength: 20,
      maxIssues: 30,
      maxWorkersPerInstance: 4,
      workerMemoryMb: 2048
    });
    expect(maxWorkersPerInstance()).toBe(4);
    expect(workerMemoryMb()).toBe(2048);
    expect(maxFileBytes()).toBe(5 * 1_048_576);
    expect(retentionMs()).toBe(2 * 86_400_000);
    expect(fileLimits()).toEqual({
      maxRows: 10,
      maxCellLength: 20,
      maxIssues: 30
    });
  });

  it('gives whole numbers of workers and megabytes', () => {
    set({ maxWorkersPerInstance: 2.9, workerMemoryMb: 511.5 });
    expect(maxWorkersPerInstance()).toBe(2);
    expect(workerMemoryMb()).toBe(511);
  });

  it('rounds the size down to whole bytes', () => {
    set({ maxFileSizeMb: 0.5 });
    expect(maxFileBytes()).toBe(524_288);
  });
});
