import { getValue } from '../../../lib/util/registry.js';
import type { WebhookTopic } from '../types/index.js';
import { WebhookValidationError } from './errors.js';

const FALLBACK_GROUP = 'Other';

type RegisteredTopic = Partial<WebhookTopic> & { name: string };

/**
 * Clean up what modules registered: a missing label falls back to the code, a
 * missing group to "Other", and a later registration of the same name replaces
 * the earlier one (so an extension can re-word a core topic) while keeping its
 * original position.
 */
export function normalizeTopics(topics: RegisteredTopic[]): WebhookTopic[] {
  const byName = new Map<string, WebhookTopic>();
  topics.forEach((topic) => {
    if (!topic || typeof topic.name !== 'string' || topic.name === '') {
      return;
    }
    byName.set(topic.name, {
      name: topic.name,
      label: topic.label || topic.name,
      description: topic.description || '',
      group: topic.group || FALLBACK_GROUP
    });
  });
  return [...byName.values()];
}

/**
 * The topics an admin may choose. Modules add theirs with
 * `addProcessor('webhookTopics', (topics) => [...topics, {...}])` from
 * `bootstrap.ts`. A stable list, so the registry's per-key cache is safe.
 */
export async function getWebhookTopics(): Promise<WebhookTopic[]> {
  const topics = await getValue<RegisteredTopic[]>('webhookTopics', []);
  return normalizeTopics(topics);
}

/** Look up a topic's metadata by code, or undefined if it is not registered. */
export async function findWebhookTopic(
  name: string
): Promise<WebhookTopic | undefined> {
  return (await getWebhookTopics()).find((topic) => topic.name === name);
}

/**
 * Validate the topics an admin submitted: a non-empty array of registered,
 * unique topic codes. Returns the cleaned list.
 */
export async function assertValidTopics(topics: unknown): Promise<string[]> {
  if (!Array.isArray(topics) || topics.length === 0) {
    throw new WebhookValidationError('Select at least one topic');
  }
  const known = new Set((await getWebhookTopics()).map((t) => t.name));
  const unique = [...new Set(topics)];
  const unknown = unique.filter(
    (topic) => typeof topic !== 'string' || !known.has(topic)
  );
  if (unknown.length > 0) {
    throw new WebhookValidationError(
      `Unknown topic: ${unknown.map(String).join(', ')}`
    );
  }
  return unique as string[];
}
