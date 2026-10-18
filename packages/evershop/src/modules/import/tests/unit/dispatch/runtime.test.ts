import { EventEmitter } from 'events';
import { existsSync } from 'fs';
import config from 'config';
import { afterEach, describe, expect, it } from '@jest/globals';
import type { SpawnFn } from '../../../adapters/NodeWorkerPool.js';

/**
 * How the subscriber's wiring reads the configuration and finds the worker. It
 * builds objects and starts no process: `spawn` is replaced.
 */
process.env.ALLOW_CONFIG_MUTATIONS = 'true';

const { WORKER_SCRIPT, createDispatchDeps, dispatchDeps } = await import(
  '../../../dispatch/runtime.js'
);

const set = (values: Record<string, unknown>) => {
  (config as unknown as { util: { extendDeep: Function } }).util.extendDeep(
    config,
    { system: { import: values } }
  );
};

afterEach(() => {
  set({ maxWorkersPerInstance: undefined, workerMemoryMb: undefined });
});

function spy() {
  const calls: Array<{ command: string; args: readonly string[] }> = [];
  const spawn: SpawnFn = (command, args) => {
    calls.push({ command, args });
    const child = new EventEmitter() as EventEmitter & { unref(): void };
    child.unref = () => undefined;
    return child as never;
  };
  return { calls, spawn };
}

describe('createDispatchDeps', () => {
  it('points at a compiled worker that is there', () => {
    expect(WORKER_SCRIPT).toMatch(
      /modules[\\/]import[\\/]worker[\\/]main\.js$/
    );
    expect(existsSync(WORKER_SCRIPT)).toBe(true);
  });

  it('has the defaults of § 8.7: two workers of 1,024 MB', () => {
    const { calls, spawn } = spy();
    const deps = createDispatchDeps(spawn);
    expect(deps.maxWorkers).toBe(2);
    deps.workers.start('11111111-2222-4333-8444-555555555555');
    expect(calls[0].args).toEqual([
      '--max-old-space-size=1024',
      WORKER_SCRIPT,
      '11111111-2222-4333-8444-555555555555'
    ]);
  });

  it('follows maxWorkersPerInstance and workerMemoryMb', () => {
    set({ maxWorkersPerInstance: 3, workerMemoryMb: 256 });
    const { calls, spawn } = spy();
    const deps = createDispatchDeps(spawn);
    expect(deps.maxWorkers).toBe(3);
    deps.workers.start('11111111-2222-4333-8444-555555555555');
    expect(calls[0].args[0]).toBe('--max-old-space-size=256');
  });

  it('counts the workers of the instance in one place: the same object every time', () => {
    expect(dispatchDeps()).toBe(dispatchDeps());
    expect(dispatchDeps().workers).toBe(dispatchDeps().workers);
  });
});
