import type { EventMeta } from '../../../../lib/event/subscriber.js';
import { enqueueDeliveries } from '../../services/enqueueDeliveries.js';

/**
 * Wildcard subscriber (`subscribers/_all/`): runs for EVERY event. It does
 * nothing unless an enabled webhook wants this event's topic; see
 * `enqueueDeliveries` for the write-first pipeline.
 */
export default async function enqueueWebhookDeliveries(
  data: unknown,
  meta?: EventMeta
): Promise<void> {
  if (!meta) {
    return;
  }
  await enqueueDeliveries(meta.name, data, meta.uuid);
}
