import { Agent } from 'undici';
import { createGuardedLookup } from './guardedLookup.js';
import type { GuardOptions } from './guardedLookup.js';

/**
 * An undici `Agent` that connects only to addresses the guard allows. Use it as
 * the `dispatcher` of a request.
 */
export function createGuardedAgent(options: GuardOptions): Agent {
  return new Agent({
    connect: { lookup: createGuardedLookup(options) } as any
  });
}
