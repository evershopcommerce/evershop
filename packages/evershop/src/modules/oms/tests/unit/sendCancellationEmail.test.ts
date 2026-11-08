import { beforeEach, describe, expect, it, jest } from '@jest/globals';

/**
 * The "order canceled" email goes to the customer of a placed order only. An
 * order never placed (its payment abandoned or failed) got no confirmation
 * either, and the abandoned order crons give its cart back for an
 * abandoned-cart reminder: "your order is canceled" would contradict it. The
 * database, the mail service and the store language are fakes.
 */
let order: Record<string, unknown> | null = null;
const sent: Array<{ code: string; args: any }> = [];

jest.unstable_mockModule('@evershop/postgres-query-builder', () => ({
  select: () => {
    const query: Record<string, unknown> = {};
    for (const step of ['from', 'where', 'and']) {
      query[step] = () => query;
    }
    query.load = async () => order;
    return query;
  }
}));
jest.unstable_mockModule('../../../../lib/postgres/connection.js', () => ({
  pool: {}
}));
jest.unstable_mockModule('../../../../lib/mail/emailHelper.js', () => ({
  sendEmail: async (code: string, args: unknown) => {
    sent.push({ code, args });
  }
}));
// The real module (other modules import more from it), the store language faked
const settingModule = await import('../../../setting/services/setting.js');
jest.unstable_mockModule('../../../setting/services/setting.js', () => ({
  ...settingModule,
  getStoreLanguage: async () => 'en'
}));
jest.unstable_mockModule('../../../../lib/log/logger.js', () => ({
  debug: () => undefined,
  error: (e: Error) => {
    throw e;
  }
}));

const { default: sendCancellationEmail } = await import(
  '../../subscribers/order_canceled/sendCancellationEmail.js'
);

beforeEach(() => {
  sent.length = 0;
});

describe('sendCancellationEmail', () => {
  it('emails the customer of a placed order, with the reason', async () => {
    order = {
      order_id: 1,
      customer_email: 'jane@shop.dev',
      placed_at: new Date('2026-11-08T08:00:00Z')
    };
    await sendCancellationEmail({ orderId: 1, reason: 'Out of stock' });
    expect(sent).toHaveLength(1);
    expect(sent[0].code).toBe('order_canceled');
    expect(sent[0].args).toMatchObject({
      to: 'jane@shop.dev',
      data: { reason: 'Out of stock' }
    });
  });

  it('nothing for an order never placed (an abandoned or failed payment), nor without an email', async () => {
    order = { order_id: 2, customer_email: 'jane@shop.dev', placed_at: null };
    await sendCancellationEmail({
      orderId: 2,
      reason: 'Abandoned Stripe checkout: the payment was never completed'
    });
    order = { order_id: 3, customer_email: null, placed_at: new Date() };
    await sendCancellationEmail({ orderId: 3 });
    order = null;
    await sendCancellationEmail({ orderId: 4 });
    expect(sent).toEqual([]);
  });
});
