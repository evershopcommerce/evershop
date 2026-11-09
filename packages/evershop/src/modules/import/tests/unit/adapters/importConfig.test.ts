import config from 'config';
import { afterEach, beforeAll, describe, expect, it } from '@jest/globals';

/**
 * `system.import.*` read from the configuration with a default. The settings are
 * set in the loaded configuration, as the other tests of core do.
 */
process.env.ALLOW_CONFIG_MUTATIONS = 'true';

const {
  backlogLimits,
  fileLimits,
  imageConcurrency,
  importFlag,
  importSetting,
  lockTimeoutMs,
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
    imageConcurrency: undefined,
    maxWorkersPerInstance: undefined,
    workerMemoryMb: undefined,
    eventBacklogHigh: undefined,
    eventBacklogLow: undefined,
    eventBacklogMaxWaitMinutes: undefined,
    lockTimeoutSeconds: undefined
  });
});

describe('lockTimeoutMs', () => {
  it('is 10 seconds by default, follows lockTimeoutSeconds, and falls back for a value that is not a positive number', () => {
    expect(lockTimeoutMs()).toBe(10_000);
    set({ lockTimeoutSeconds: 2.5 });
    expect(lockTimeoutMs()).toBe(2500);
    set({ lockTimeoutSeconds: 0 });
    expect(lockTimeoutMs()).toBe(10_000);
    set({ lockTimeoutSeconds: -4 });
    expect(lockTimeoutMs()).toBe(10_000);
  });
});

describe('imageConcurrency', () => {
  it('is 4 by default, as many as are set, and never less than one', () => {
    expect(imageConcurrency()).toBe(4);
    set({ imageConcurrency: 8 });
    expect(imageConcurrency()).toBe(8);
    set({ imageConcurrency: 2.9 });
    expect(imageConcurrency()).toBe(2);
    // A value under one is the default or one: never none at all.
    set({ imageConcurrency: 0.5 });
    expect(imageConcurrency()).toBe(1);
    set({ imageConcurrency: 0 });
    expect(imageConcurrency()).toBe(4);
    set({ imageConcurrency: -3 });
    expect(imageConcurrency()).toBe(4);
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

describe('backlogLimits: when the import slows down for the event queue (§ 8.5)', () => {
  it('has the defaults of the spec: pause above 500, go on below 100, give up after 30 minutes', () => {
    expect(backlogLimits()).toEqual({
      eventBacklogHigh: 500,
      eventBacklogLow: 100,
      eventBacklogMaxWaitMs: 30 * 60_000
    });
  });

  it('follows the configuration, with the time in minutes made milliseconds', () => {
    set({
      eventBacklogHigh: 2000,
      eventBacklogLow: 400,
      eventBacklogMaxWaitMinutes: 5
    });
    expect(backlogLimits()).toEqual({
      eventBacklogHigh: 2000,
      eventBacklogLow: 400,
      eventBacklogMaxWaitMs: 300_000
    });
  });

  it('takes a time in fractions of a minute', () => {
    set({ eventBacklogMaxWaitMinutes: 0.5 });
    expect(backlogLimits().eventBacklogMaxWaitMs).toBe(30_000);
  });

  it('holds the low mark at the high one when it is set above it: the import would stop and start on every look', () => {
    set({ eventBacklogHigh: 50, eventBacklogLow: 400 });
    expect(backlogLimits()).toMatchObject({
      eventBacklogHigh: 50,
      eventBacklogLow: 50
    });
    set({ eventBacklogHigh: 50, eventBacklogLow: 50 });
    expect(backlogLimits().eventBacklogLow).toBe(50);
    set({ eventBacklogHigh: 50, eventBacklogLow: 49 });
    expect(backlogLimits().eventBacklogLow).toBe(49);
  });

  it('holds the default low mark under a high mark that is set below it', () => {
    set({ eventBacklogHigh: 20 });
    expect(backlogLimits()).toMatchObject({
      eventBacklogHigh: 20,
      eventBacklogLow: 20
    });
  });

  it.each([[0], [-1], ['soon']])('uses the default for %j', (value) => {
    set({
      eventBacklogHigh: value,
      eventBacklogLow: value,
      eventBacklogMaxWaitMinutes: value
    });
    expect(backlogLimits()).toEqual({
      eventBacklogHigh: 500,
      eventBacklogLow: 100,
      eventBacklogMaxWaitMs: 30 * 60_000
    });
  });
});
