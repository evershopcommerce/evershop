import { describe, expect, it } from '@jest/globals';

/**
 * The Stripe abandoned order job's decisions, with every seam faked (no
 * Stripe, no database): only Stripe knows whether an unpaid order was
 * abandoned or its money is on the way, so the job asks about every intent of
 * the order, and cancels the order only when none can still bring money,
 * after canceling those intents at Stripe. The database side runs for real in
 * `abandonedOrders.test.ts`.
 */
const { decideAbandonedStripeOrder, reconcileStripeOrder } = await import(
  '../../services/reconcileAbandonedOrders.js'
);

const NOW = Date.parse('2026-11-08T12:00:00Z');
const HOUR = 3_600_000;

const intent = (id: string, status: string) =>
  ({ id, status, amount: 1000, currency: 'usd' } as any);

function harness(
  intents: Record<string, any>,
  over: Record<string, unknown> = {}
) {
  const calls: string[] = [];
  const deps = {
    storedIntentIds: async () => Object.keys(intents),
    searchIntentIds: async () => {
      calls.push('search');
      return [];
    },
    retrieve: async (id: string) => intents[id] ?? null,
    cancelIntent: async (id: string) => {
      calls.push(`cancel intent ${id}`);
    },
    record: async (_order: unknown, i: any, kind: string) => {
      calls.push(`record ${kind} ${i.id}`);
      return 'recorded' as const;
    },
    cancelAbandonedOrder: async (uuid: string, reason: string) => {
      calls.push(`cancel order ${uuid}: ${reason}`);
      return { cartReopened: true };
    },
    now: () => NOW,
    ...over
  };
  return { calls, deps: deps as any };
}

const order = (ageHours = 2) => ({
  order_id: 5,
  uuid: 'o-5',
  created_at: new Date(NOW - ageHours * HOUR)
});

describe('decideAbandonedStripeOrder', () => {
  it('a succeeded or authorized intent is a payment whose webhook was lost', () => {
    expect(
      decideAbandonedStripeOrder([
        intent('a', 'requires_payment_method'),
        intent('b', 'succeeded')
      ])
    ).toMatchObject({ action: 'record', kind: 'capture', intent: { id: 'b' } });
    expect(
      decideAbandonedStripeOrder([intent('a', 'requires_capture')])
    ).toMatchObject({ action: 'record', kind: 'authorization' });
  });

  it('a processing intent (a bank debit on its way) or an unknown state: wait', () => {
    expect(
      decideAbandonedStripeOrder([
        intent('a', 'requires_action'),
        intent('b', 'processing')
      ])
    ).toEqual({ action: 'wait', reason: 'a payment is processing' });
    expect(
      decideAbandonedStripeOrder([intent('a', 'some_future_state')])
    ).toMatchObject({ action: 'wait' });
  });

  it('only unfinished or canceled intents, or none: cancel, closing the open ones first', () => {
    const decision = decideAbandonedStripeOrder([
      intent('a', 'requires_payment_method'),
      intent('b', 'requires_action'),
      intent('c', 'requires_confirmation'),
      intent('d', 'canceled')
    ]);
    expect(decision.action).toBe('cancel');
    expect((decision as any).open.map((i: any) => i.id)).toEqual([
      'a',
      'b',
      'c'
    ]);
    expect(decideAbandonedStripeOrder([])).toEqual({
      action: 'cancel',
      open: []
    });
  });
});

describe('reconcileStripeOrder', () => {
  it('an abandoned 3-D Secure check: every open intent canceled at Stripe, then the order, and its cart given back', async () => {
    const h = harness({
      pi_1: intent('pi_1', 'requires_action'),
      pi_2: intent('pi_2', 'canceled')
    });
    expect(await reconcileStripeOrder(order(), h.deps)).toBe(
      'canceled, cart given back'
    );
    expect(h.calls).toEqual([
      'cancel intent pi_1',
      'cancel order o-5: Abandoned Stripe checkout: the payment was never completed'
    ]);
  });

  it('an intent that cannot be canceled (the shopper paid this very moment): the order stays as it is', async () => {
    const h = harness(
      { pi_1: intent('pi_1', 'requires_action') },
      {
        cancelIntent: async () => {
          throw new Error('This PaymentIntent could not be canceled');
        }
      }
    );
    await expect(reconcileStripeOrder(order(), h.deps)).rejects.toThrow(
      'could not be canceled'
    );
    expect(h.calls.some((c) => c.startsWith('cancel order'))).toBe(false);
  });

  it('a processing intent: nothing is canceled', async () => {
    const h = harness({ pi_1: intent('pi_1', 'processing') });
    expect(await reconcileStripeOrder(order(), h.deps)).toBe(
      'waiting (a payment is processing)'
    );
    expect(h.calls).toEqual([]);
  });

  it('a payment whose webhook was lost is recorded, never canceled', async () => {
    const h = harness({ pi_1: intent('pi_1', 'succeeded') });
    expect(await reconcileStripeOrder(order(), h.deps)).toBe(
      'paid, the webhook was missed: capture recorded'
    );
    expect(h.calls).toEqual(['record capture pi_1']);
    const mismatch = harness(
      { pi_1: intent('pi_1', 'succeeded') },
      { record: async () => 'mismatch' }
    );
    expect(await reconcileStripeOrder(order(), mismatch.deps)).toBe(
      'paid at Stripe but not recorded (mismatch)'
    );
  });

  it('an intent this Stripe account does not know (keys changed): wait, never cancel', async () => {
    const h = harness({ pi_1: null } as any);
    expect(await reconcileStripeOrder(order(), h.deps)).toMatch(
      /^waiting \(payment intent pi_1 unknown/
    );
    expect(h.calls).toEqual([]);
  });

  it('no stored intent: Stripe search only after 6 hours (it can lag an hour); none found means none was made, so cancel', async () => {
    const young = harness({});
    expect(await reconcileStripeOrder(order(2), young.deps)).toMatch(
      /^waiting \(no stored payment intent/
    );
    expect(young.calls).toEqual([]);

    const old = harness({});
    expect(await reconcileStripeOrder(order(7), old.deps)).toBe(
      'canceled, cart given back'
    );
    expect(old.calls[0]).toBe('search');

    const found = harness(
      {},
      {
        searchIntentIds: async () => ['pi_9'],
        retrieve: async () => intent('pi_9', 'processing')
      }
    );
    expect(await reconcileStripeOrder(order(7), found.deps)).toBe(
      'waiting (a payment is processing)'
    );
  });

  it('no search where Stripe has none (India): wait', async () => {
    const h = harness(
      {},
      {
        searchIntentIds: async () => {
          throw new Error('Search is not available');
        }
      }
    );
    expect(await reconcileStripeOrder(order(7), h.deps)).toBe(
      'waiting (Stripe search unavailable: Search is not available)'
    );
  });
});
