import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const getValue = jest.fn<(...args: any[]) => Promise<any>>();
jest.unstable_mockModule('../../../../lib/util/registry.js', () => ({
  getValue
}));

const { coreWebhookTopics } = await import('../../services/coreWebhookTopics.js');
const { normalizeTopics, getWebhookTopics, findWebhookTopic, assertValidTopics } =
  await import('../../services/webhookTopics.js');
const { WebhookValidationError } = await import('../../services/errors.js');

describe('coreWebhookTopics', () => {
  it('gives every topic a code, label, description and group', () => {
    coreWebhookTopics.forEach((topic) => {
      expect(topic.name).toMatch(/^[a-z]+(_[a-z]+)+$/);
      expect(topic.label.length).toBeGreaterThan(0);
      expect(topic.description.length).toBeGreaterThan(0);
      expect(topic.group.length).toBeGreaterThan(0);
    });
  });

  it('has no duplicate codes', () => {
    const names = coreWebhookTopics.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('never lists the reserved test topic', () => {
    expect(coreWebhookTopics.some((t) => t.name === 'webhook_ping')).toBe(false);
  });

  it('never describes a customer topic without promising to omit the password', () => {
    coreWebhookTopics
      .filter((t) => t.name.startsWith('customer_'))
      .forEach((t) => expect(t.description).toContain('never the password'));
  });
});

describe('normalizeTopics', () => {
  it('falls back to the code as label and "Other" as group', () => {
    expect(normalizeTopics([{ name: 'my_event' }])).toEqual([
      { name: 'my_event', label: 'my_event', description: '', group: 'Other' }
    ]);
  });

  it('lets a later registration replace an earlier one, keeping its position', () => {
    const out = normalizeTopics([
      { name: 'a', label: 'A', description: 'd', group: 'G' },
      { name: 'b', label: 'B', description: 'd', group: 'G' },
      { name: 'a', label: 'A2', description: 'd2', group: 'G' }
    ]);
    expect(out.map((t) => t.name)).toEqual(['a', 'b']);
    expect(out[0].label).toBe('A2');
  });

  it('drops entries without a usable name', () => {
    expect(
      normalizeTopics([{ name: '' }, { name: 5 as any }, null as any])
    ).toEqual([]);
  });
});

describe('topic lookup and validation', () => {
  beforeEach(() => {
    getValue.mockReset();
    getValue.mockResolvedValue([
      { name: 'order_placed', label: 'Order placed', group: 'Orders' },
      { name: 'product_created', label: 'Product created', group: 'Products' }
    ]);
  });

  it('reads the list from the webhookTopics registry value', async () => {
    const topics = await getWebhookTopics();
    expect(getValue).toHaveBeenCalledWith('webhookTopics', []);
    expect(topics.map((t) => t.name)).toEqual(['order_placed', 'product_created']);
  });

  it('finds a topic by code, or returns undefined', async () => {
    expect((await findWebhookTopic('order_placed'))?.label).toBe('Order placed');
    expect(await findWebhookTopic('nope')).toBeUndefined();
  });

  it('accepts registered topics and removes duplicates', async () => {
    expect(
      await assertValidTopics(['order_placed', 'order_placed', 'product_created'])
    ).toEqual(['order_placed', 'product_created']);
  });

  it.each([
    ['an empty list', []],
    ['not an array', 'order_placed'],
    ['undefined', undefined]
  ])('rejects %s', async (_label, value) => {
    await expect(assertValidTopics(value)).rejects.toThrow(
      'Select at least one topic'
    );
  });

  it('rejects an unknown topic and names it', async () => {
    await expect(
      assertValidTopics(['order_placed', 'made_up'])
    ).rejects.toThrow('Unknown topic: made_up');
  });

  it('rejects the reserved test topic: it cannot be selected', async () => {
    await expect(assertValidTopics(['webhook_ping'])).rejects.toBeInstanceOf(
      WebhookValidationError
    );
  });

  it('rejects a non-string entry', async () => {
    await expect(assertValidTopics([42])).rejects.toThrow('Unknown topic: 42');
  });
});
