import path from 'path';
import { registerJob } from '../../lib/cronjob/jobManager.js';
import { CONSTANTS } from '../../lib/helpers.js';
import { warning } from '../../lib/log/logger.js';
import { defaultPaginationFilters } from '../../lib/util/defaultPaginationFilters.js';
import { addProcessor } from '../../lib/util/registry.js';
import { coreWebhookTopics } from './services/coreWebhookTopics.js';
import { registerDefaultWebhookDeliveryFilters } from './services/registerDefaultWebhookDeliveryFilters.js';
import type { WebhookTopic } from './types/index.js';

export default (): void => {
  // The events an admin can send to a webhook. Extensions add their own the
  // same way: addProcessor('webhookTopics', (topics) => [...topics, {...}]).
  addProcessor<WebhookTopic[]>(
    'webhookTopics',
    (topics) => [...topics, ...coreWebhookTopics],
    1
  );

  // Delivery list filters (status) + pagination.
  addProcessor(
    'webhookDeliveryCollectionFilters',
    registerDefaultWebhookDeliveryFilters,
    1
  );
  addProcessor<Array<any>>(
    'webhookDeliveryCollectionFilters',
    (filters) => [...filters, ...defaultPaginationFilters],
    2
  );

  // The delivery worker: retries due deliveries, reclaims stuck ones, trims
  // the log. registerJob throws on a bad cron expression; degrade to a skipped
  // job, never a store that will not boot.
  try {
    registerJob({
      name: 'webhookProcessDeliveries',
      schedule: '* * * * *',
      resolve: path.resolve(
        CONSTANTS.MODULESPATH,
        'webhook/services/processDeliveries.js'
      ),
      enabled: true
    });
  } catch (e) {
    warning(`Skipping webhookProcessDeliveries job registration: ${e.message}`);
  }
};
