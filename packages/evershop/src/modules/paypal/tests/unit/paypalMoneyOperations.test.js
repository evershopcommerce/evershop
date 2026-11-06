import { jest, describe, it, expect } from '@jest/globals';
import {
  capturePaypalAuthorization,
  refundPaypalCapture,
  refundRequestId
} from '../../services/paypalMoneyOperations.js';

/**
 * Admin capture and refund used `PayPal-Request-Id: <uuid>-<op>-<Date.now()>`,
 * a new key on every attempt: a retry after a lost response (or a double
 * click) refunded the buyer twice, and a capture PayPal had already made
 * could never be recorded. The keys now name the operation, so PayPal replays
 * a retry instead of repeating it.
 */
const order = { uuid: 'ORDER-UUID', currency: 'USD', order_number: '10021' };

function fakePaypal({ post, get = {} }) {
  return {
    post: jest.fn(async () => post),
    get: jest.fn(async (url) => ({ data: get[url] }))
  };
}

describe('refundRequestId', () => {
  it('is the same for a retry of the same refund', () => {
    expect(refundRequestId('U', 'CAP', 0, 5, 'USD')).toBe(
      refundRequestId('U', 'CAP', 0, 5, 'USD')
    );
  });

  it('changes for a later refund of the same amount', () => {
    expect(refundRequestId('U', 'CAP', 5, 5, 'USD')).not.toBe(
      refundRequestId('U', 'CAP', 0, 5, 'USD')
    );
  });

  it('compares money in minor units', () => {
    expect(refundRequestId('U', 'CAP', 0.1 + 0.2, 5, 'USD')).toBe(
      refundRequestId('U', 'CAP', 0.3, 5, 'USD')
    );
    expect(refundRequestId('U', 'CAP', 0, 1000, 'JPY')).toBe(
      'U-refund-CAP-0-1000'
    );
  });
});

describe('capturePaypalAuthorization', () => {
  it('captures with a key that stays the same on a retry', async () => {
    const paypal = fakePaypal({
      post: {
        status: 201,
        data: {
          id: 'CAP-1',
          status: 'COMPLETED',
          amount: { currency_code: 'USD', value: '20.00' }
        }
      }
    });
    const first = await capturePaypalAuthorization(paypal, 'U', 'AUTH-1', 20);
    await capturePaypalAuthorization(paypal, 'U', 'AUTH-1', 20);
    expect(first).toMatchObject({ transactionId: 'CAP-1', amount: 20 });
    const keys = paypal.post.mock.calls.map(
      (call) => call[2].headers['PayPal-Request-Id']
    );
    expect(keys).toEqual(['U-capture-AUTH-1', 'U-capture-AUTH-1']);
  });

  it('records the capture PayPal already made instead of failing', async () => {
    const paypal = fakePaypal({
      post: {
        status: 422,
        data: { details: [{ issue: 'AUTHORIZATION_ALREADY_CAPTURED' }] }
      },
      get: {
        '/v2/payments/authorizations/AUTH-1': {
          links: [
            {
              rel: 'up',
              href: 'https://api-m.paypal.com/v2/checkout/orders/PP-ORDER'
            }
          ]
        },
        '/v2/checkout/orders/PP-ORDER': {
          purchase_units: [
            {
              payments: {
                captures: [
                  {
                    id: 'CAP-DASHBOARD',
                    status: 'COMPLETED',
                    amount: { currency_code: 'USD', value: '20.00' }
                  }
                ]
              }
            }
          ]
        }
      }
    });
    await expect(
      capturePaypalAuthorization(paypal, 'U', 'AUTH-1', 20)
    ).resolves.toMatchObject({ transactionId: 'CAP-DASHBOARD', amount: 20 });
  });

  it('fails on any other refusal', async () => {
    const paypal = fakePaypal({
      post: {
        status: 422,
        data: {
          message: 'Authorization has expired',
          details: [{ issue: 'AUTHORIZATION_EXPIRED' }]
        }
      }
    });
    await expect(
      capturePaypalAuthorization(paypal, 'U', 'AUTH-1', 20)
    ).rejects.toThrow('Authorization has expired');
  });
});

describe('refundPaypalCapture', () => {
  it('refunds with the key of this refund and reports what PayPal moved', async () => {
    const paypal = fakePaypal({
      post: {
        status: 201,
        data: {
          id: 'REF-1',
          status: 'COMPLETED',
          amount: { currency_code: 'USD', value: '5.00' }
        }
      }
    });
    const result = await refundPaypalCapture(paypal, {
      order,
      captureId: 'CAP-1',
      amount: 5,
      refundedBefore: 0
    });
    expect(result).toMatchObject({ transactionId: 'REF-1', amount: 5 });
    expect(paypal.post.mock.calls[0][2].headers['PayPal-Request-Id']).toBe(
      'ORDER-UUID-refund-CAP-1-0-500'
    );
  });

  it('fails when PayPal refuses the refund', async () => {
    const paypal = fakePaypal({
      post: { status: 422, data: { message: 'Refund amount too high' } }
    });
    await expect(
      refundPaypalCapture(paypal, {
        order,
        captureId: 'CAP-1',
        amount: 500,
        refundedBefore: 0
      })
    ).rejects.toThrow('Refund amount too high');
  });
});
