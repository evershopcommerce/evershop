import { select } from '@evershop/postgres-query-builder';
import { translate } from '../../../../../lib/locale/translate/translate.js';
import { pool } from '../../../../../lib/postgres/connection.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { MAX_WEBHOOKS, PING_TOPIC } from '../../../services/constants.js';
import { getLogLimit } from '../../../services/logLimit.js';
import { WebhookDeliveryCollection } from '../../../services/WebhookDeliveryCollection.js';
import {
  findWebhookTopic,
  getWebhookTopics
} from '../../../services/webhookTopics.js';

// A webhook with its count of deliveries still waiting and of final failures.
const WEBHOOKS_SQL = `
  SELECT w.*,
         COALESCE(c.pending, 0)::int AS pending_count,
         COALESCE(c.failed, 0)::int AS failed_count
    FROM webhook w
    LEFT JOIN (
      SELECT webhook_id,
             count(*) FILTER (WHERE status = 'pending') AS pending,
             count(*) FILTER (WHERE status = 'failed') AS failed
        FROM webhook_delivery
       WHERE status IN ('pending', 'failed')
       GROUP BY webhook_id
    ) c ON c.webhook_id = w.webhook_id`;

export default {
  Query: {
    webhooks: async () => {
      const { rows } = await pool.query(`${WEBHOOKS_SQL} ORDER BY w.webhook_id`);
      return rows.map((row) => camelCase(row));
    },
    webhook: async (_root: any, { id }: { id: string }) => {
      const { rows } = await pool.query(`${WEBHOOKS_SQL} WHERE w.uuid = $1`, [
        id
      ]);
      return rows[0] ? camelCase(rows[0]) : null;
    },
    webhookDeliveries: async (
      _root: any,
      { webhookId, filters = [] }: { webhookId: string; filters?: any[] }
    ) => {
      const webhook = await select()
        .from('webhook')
        .where('uuid', '=', webhookId)
        .load(pool);
      // Unknown webhook: an empty list, not an error.
      const query = select().from('webhook_delivery');
      query.where('webhook_delivery.webhook_id', '=', webhook?.webhook_id ?? 0);
      const collection = new WebhookDeliveryCollection(query);
      await collection.init(filters);
      return collection;
    },
    webhookTopics: async () => {
      const topics = await getWebhookTopics();
      // Labels are English source strings; translate for the admin's language.
      return topics.map((topic) => ({
        ...topic,
        label: translate(topic.label),
        description: topic.description ? translate(topic.description) : '',
        group: translate(topic.group)
      }));
    },
    webhookLogLimit: () => getLogLimit(),
    webhookMax: () => MAX_WEBHOOKS
  },
  Webhook: {
    editUrl: ({ uuid }: any) => buildUrl('webhookEdit', { id: uuid }),
    updateApi: ({ uuid }: any) => buildUrl('updateWebhook', { id: uuid }),
    deleteApi: ({ uuid }: any) => buildUrl('deleteWebhook', { id: uuid }),
    testApi: ({ uuid }: any) => buildUrl('testWebhook', { id: uuid })
  },
  WebhookDelivery: {
    retryApi: ({ uuid }: any) => buildUrl('retryWebhookDelivery', { id: uuid }),
    topicLabel: async ({ topic }: any) => {
      if (topic === PING_TOPIC) {
        return translate('Test event');
      }
      const found = await findWebhookTopic(topic);
      return found ? translate(found.label) : topic;
    }
  }
};
