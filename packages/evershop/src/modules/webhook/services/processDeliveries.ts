import { error as logError } from '../../../lib/log/logger.js';
import { refreshSetting } from '../../setting/services/setting.js';
import type { ClaimedDelivery } from '../types/index.js';
import { CLAIM_BATCH_SIZE, DELIVERY_CONCURRENCY } from './constants.js';
import { deliverWebhook } from './deliverWebhook.js';
import {
  cancelPendingForDisabled,
  claimDue,
  reclaimStuck,
  trimFailed,
  trimFinished
} from './deliveryStore.js';
import { getLogLimit } from './logLimit.js';

export type TickDeps = {
  refreshSettings: () => Promise<void>;
  cancelPendingForDisabled: () => Promise<number>;
  reclaimStuck: () => Promise<number>;
  claimDue: (limit: number) => Promise<ClaimedDelivery[]>;
  deliver: (delivery: ClaimedDelivery) => Promise<unknown>;
  getLogLimit: () => Promise<number>;
  trimFinished: (limit: number) => Promise<number>;
  trimFailed: () => Promise<number>;
  logError: (e: unknown) => void;
};

const defaultDeps: TickDeps = {
  refreshSettings: refreshSetting,
  cancelPendingForDisabled: () => cancelPendingForDisabled(),
  reclaimStuck: () => reclaimStuck(),
  claimDue: (limit) => claimDue(limit),
  deliver: (delivery) => deliverWebhook(delivery),
  getLogLimit,
  trimFinished: (limit) => trimFinished(limit),
  trimFailed: () => trimFailed(),
  logError: (e) => logError(e)
};

/**
 * One pass of the delivery worker (the `webhookProcessDeliveries` cron job):
 *
 *  1. cancel pending deliveries of disabled webhooks,
 *  2. reclaim `sending` rows whose worker died,
 *  3. claim the due retries and send them, `DELIVERY_CONCURRENCY` at a time,
 *  4. trim the log (finished rows beyond the limit, old failed rows).
 *
 * Each step is isolated: one failing never stops the next.
 */
export async function runDeliveryTick(
  deps: TickDeps = defaultDeps
): Promise<{ claimed: number }> {
  const step = async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
    try {
      return await fn();
    } catch (e) {
      deps.logError(e);
      return undefined;
    }
  };

  // This process keeps its own settings cache; refresh it so a change to
  // `webhookLogLimit` applies without a restart.
  await step(deps.refreshSettings);
  await step(deps.cancelPendingForDisabled);
  await step(deps.reclaimStuck);

  const due = (await step(() => deps.claimDue(CLAIM_BATCH_SIZE))) ?? [];
  for (let i = 0; i < due.length; i += DELIVERY_CONCURRENCY) {
    const results = await Promise.allSettled(
      due.slice(i, i + DELIVERY_CONCURRENCY).map((d) => deps.deliver(d))
    );
    results.forEach((r) => {
      if (r.status === 'rejected') {
        deps.logError(r.reason);
      }
    });
  }

  await step(async () => deps.trimFinished(await deps.getLogLimit()));
  await step(deps.trimFailed);
  return { claimed: due.length };
}

/** The cron job entry point (`registerJob` resolves to this module). */
export default async function processDeliveries(): Promise<void> {
  await runDeliveryTick();
}
