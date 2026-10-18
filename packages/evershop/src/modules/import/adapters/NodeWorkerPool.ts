import { spawn as nodeSpawn } from 'child_process';
import type { ChildProcess, SpawnOptions } from 'child_process';
import type { Logger } from '../services/ports/logger.js';
import type { WorkerPool } from '../services/ports/workerPool.js';

export type SpawnFn = (
  command: string,
  args: readonly string[],
  options: SpawnOptions
) => ChildProcess;

export interface NodeWorkerPoolOptions {
  /** The path of the compiled `worker/main.js`. */
  script: string;
  /** `--max-old-space-size` of the worker (`workerMemoryMb`, § 8.7). */
  memoryMb: number;
  logger: Logger;
  /** The Node binary; the one that runs this process by default. */
  execPath?: string;
  /** The environment the worker starts with; this process's by default. */
  env?: NodeJS.ProcessEnv;
  /** For a test. */
  spawn?: SpawnFn;
}

/**
 * Starts the workers as Node processes (§ 8.4, the spawn contract):
 *
 * - `detached`, so a signal sent to the group of the event process does not
 *   reach it, and `unref`, so the event process does not wait for it;
 * - no IPC channel and no input; the output of the worker goes where the output
 *   of this process goes, as it does for the event and cron processes;
 * - the memory ceiling as an argument, and `ALLOW_CONFIG_MUTATIONS=true`, which
 *   the bootstrap of the modules needs and the event process has switched off
 *   after its own boot (`startSubscriberProcess` sets it for the same reason).
 *
 * It counts the workers it has started that have not ended, for the limit of
 * `maxWorkersPerInstance`. A worker of an earlier event process is not counted.
 */
export class NodeWorkerPool implements WorkerPool {
  private readonly live = new Set<ChildProcess>();

  constructor(private readonly options: NodeWorkerPoolOptions) {}

  running(): number {
    return this.live.size;
  }

  start(jobUuid: string): void {
    const { options } = this;
    const run = options.spawn ?? nodeSpawn;
    const child = run(
      options.execPath ?? process.execPath,
      [`--max-old-space-size=${options.memoryMb}`, options.script, jobUuid],
      {
        detached: true,
        stdio: ['ignore', 'inherit', 'inherit'],
        env: {
          ...(options.env ?? process.env),
          ALLOW_CONFIG_MUTATIONS: 'true'
        }
      }
    );
    this.live.add(child);
    // A process that could not be started reports it here and never exits.
    child.once('error', (e) => {
      this.live.delete(child);
      options.logger.error('An import worker could not be started', {
        jobUuid,
        reason: e.message
      });
    });
    child.once('exit', (code, signal) => {
      this.live.delete(child);
      options.logger.info('An import worker ended', { jobUuid, code, signal });
    });
    child.unref();
  }
}
