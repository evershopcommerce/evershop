import { error } from '../../../../lib/log/logger.js';
import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { recomputeRecommendationStats } from '../../services/recommendation/recomputeStats.js';

/**
 * On-demand co-purchase stats rebuild — drives the "Recompute now" button on
 * the Catalog settings card (spec § 7.5, § 10.1). Same service the nightly
 * cron runs; the advisory lock inside serializes against it. Synchronous by
 * design at target store sizes. No request body — nothing to parse or
 * validate; the default API middleware chain (auth) still applies.
 */
export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next: (err?: Error) => void
) => {
  try {
    const result = await recomputeRecommendationStats();
    response.status(OK);
    response.json({
      success: true,
      data: result
    });
  } catch (e) {
    error(e);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      success: false,
      message: 'Failed to recompute recommendation statistics'
    });
  }
};
