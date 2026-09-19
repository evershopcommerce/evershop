import { info } from '../../../../lib/log/logger.js';
import { recomputeRecommendationStats } from './recomputeStats.js';

/**
 * Cron entry (registered in catalog bootstrap, schedule from
 * catalog.crossSell.recomputeSchedule). The first run on an existing store IS
 * the historical backfill (spec § 7.5). Errors propagate — the cron runner
 * logs them; the transaction has already rolled back and yesterday's data
 * keeps serving.
 */
export default async () => {
  const result = await recomputeRecommendationStats();
  info(
    `Product recommendation stats recomputed: ${result.pairCount} directed pairs from ${result.totalOrderCount} eligible orders`
  );
};
