import { EventEmitter } from 'events';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, it, expect, afterAll } from '@jest/globals';
import { NodeWorkerPool } from '../../../adapters/NodeWorkerPool.js';
import type { SpawnFn } from '../../../adapters/NodeWorkerPool.js';
import { CollectingLogger } from '../../../testing/CollectingLogger.js';

const UUID = '11111111-2222-4333-8444-555555555555';

/** A process that does nothing, which the test ends or breaks. */
class FakeChild extends EventEmitter {
  unreffed = false;
  unref() {
    this.unreffed = true;
  }
}

function fakePool(env: NodeJS.ProcessEnv = { KEEP: 'yes' }) {
  const logger = new CollectingLogger();
  const children: FakeChild[] = [];
  const calls: Array<{
    command: string;
    args: readonly string[];
    options: Parameters<SpawnFn>[2];
  }> = [];
  const spawn: SpawnFn = (command, args, options) => {
    const child = new FakeChild();
    children.push(child);
    calls.push({ command, args, options });
    return child as never;
  };
  const pool = new NodeWorkerPool({
    script: '/app/worker/main.js',
    memoryMb: 512,
    logger,
    execPath: '/usr/bin/node',
    env,
    spawn
  });
  return { pool, logger, children, calls };
}

describe('NodeWorkerPool: how a worker is started (the spawn contract)', () => {
  it('runs the script with the memory ceiling and the uuid, detached, with no input and no IPC channel', () => {
    const { pool, calls } = fakePool();
    pool.start(UUID);
    expect(calls).toHaveLength(1);
    expect(calls[0].command).toBe('/usr/bin/node');
    expect(calls[0].args).toEqual([
      '--max-old-space-size=512',
      '/app/worker/main.js',
      UUID
    ]);
    expect(calls[0].options.detached).toBe(true);
    // Nothing in, the output where this process's output goes, and no fourth
    // entry for an IPC channel.
    expect(calls[0].options.stdio).toEqual(['ignore', 'inherit', 'inherit']);
  });

  it('gives the worker the environment, with the config mutations the bootstrap needs', () => {
    const { pool, calls } = fakePool({
      DB_HOST: 'db',
      ALLOW_CONFIG_MUTATIONS: 'false'
    });
    pool.start(UUID);
    expect(calls[0].options.env).toEqual({
      DB_HOST: 'db',
      ALLOW_CONFIG_MUTATIONS: 'true'
    });
  });

  it('does not change the environment of this process', () => {
    const env = { ALLOW_CONFIG_MUTATIONS: 'false' };
    const { pool } = fakePool(env);
    pool.start(UUID);
    expect(env).toEqual({ ALLOW_CONFIG_MUTATIONS: 'false' });
  });

  it('lets go of the worker, so that this process does not wait for it', () => {
    const { pool, children } = fakePool();
    pool.start(UUID);
    expect(children[0].unreffed).toBe(true);
  });
});

describe('NodeWorkerPool: the workers that run', () => {
  it('counts the workers it started that have not ended', () => {
    const { pool, children } = fakePool();
    expect(pool.running()).toBe(0);
    pool.start(UUID);
    pool.start(UUID);
    expect(pool.running()).toBe(2);
    children[0].emit('exit', 0, null);
    expect(pool.running()).toBe(1);
    children[1].emit('exit', null, 'SIGKILL');
    expect(pool.running()).toBe(0);
  });

  it('writes down how a worker ended', () => {
    const { pool, children, logger } = fakePool();
    pool.start(UUID);
    children[0].emit('exit', 1, null);
    expect(logger.of('info').at(-1)).toMatchObject({
      message: 'An import worker ended',
      meta: { jobUuid: UUID, code: 1, signal: null }
    });
  });

  it('does not count a worker that could not be started, and says why', () => {
    const { pool, children, logger } = fakePool();
    pool.start(UUID);
    expect(pool.running()).toBe(1);
    children[0].emit('error', new Error('spawn ENOMEM'));
    expect(pool.running()).toBe(0);
    expect(logger.of('error')).toEqual([
      {
        level: 'error',
        message: 'An import worker could not be started',
        meta: { jobUuid: UUID, reason: 'spawn ENOMEM' }
      }
    ]);
  });

  it('counts a worker once even when it reports both an error and an exit', () => {
    const { pool, children } = fakePool();
    pool.start(UUID);
    pool.start(UUID);
    children[0].emit('error', new Error('boom'));
    children[0].emit('exit', 1, null);
    expect(pool.running()).toBe(1);
  });

  it('throws what spawn throws at once, and counts nothing', () => {
    const logger = new CollectingLogger();
    const pool = new NodeWorkerPool({
      script: 'x',
      memoryMb: 64,
      logger,
      spawn: () => {
        throw new Error('EAGAIN');
      }
    });
    expect(() => pool.start(UUID)).toThrow('EAGAIN');
    expect(pool.running()).toBe(0);
  });
});

describe('NodeWorkerPool: with a real process', () => {
  const dir = mkdtempSync(join(tmpdir(), 'import-pool-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  async function until(done: () => boolean, ms = 10_000) {
    const end = Date.now() + ms;
    while (!done()) {
      if (Date.now() > end) throw new Error('timed out');
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }

  it('starts node on the script with the arguments, counts it while it runs and not after', async () => {
    const out = join(dir, 'seen.json');
    const script = join(dir, 'worker.mjs');
    writeFileSync(
      script,
      `import { writeFileSync } from 'fs';
       await new Promise((resolve) => setTimeout(resolve, 300));
       writeFileSync(${JSON.stringify(out)}, JSON.stringify({
         argv: process.argv.slice(2),
         execArgv: process.execArgv,
         mutations: process.env.ALLOW_CONFIG_MUTATIONS,
         kept: process.env.KEEP_THIS
       }));`
    );
    const logger = new CollectingLogger();
    const pool = new NodeWorkerPool({
      script,
      memoryMb: 96,
      logger,
      env: { ...process.env, KEEP_THIS: 'yes' }
    });
    pool.start(UUID);
    expect(pool.running()).toBe(1);
    await until(() => pool.running() === 0);
    const seen = JSON.parse(readFileSync(out, 'utf8'));
    expect(seen.argv).toEqual([UUID]);
    expect(seen.execArgv).toEqual(['--max-old-space-size=96']);
    expect(seen.mutations).toBe('true');
    expect(seen.kept).toBe('yes');
    expect(logger.of('info').at(-1)).toMatchObject({
      meta: { jobUuid: UUID, code: 0 }
    });
  });

  it('reports a process that cannot be started', async () => {
    const logger = new CollectingLogger();
    const pool = new NodeWorkerPool({
      script: 'x',
      memoryMb: 64,
      logger,
      execPath: join(dir, 'no-such-node')
    });
    pool.start(UUID);
    await until(() => logger.of('error').length > 0);
    expect(pool.running()).toBe(0);
    expect(String(logger.of('error')[0].meta?.reason)).toContain('ENOENT');
  });
});
