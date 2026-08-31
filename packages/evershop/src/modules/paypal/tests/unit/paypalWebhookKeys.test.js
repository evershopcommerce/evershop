import { extractEventOrderKeys } from '../../services/paypalWebhook.js';

/**
 * Pins the order-resolution contract for webhook events: capture events carry
 * the PayPal order id in supplementary_data and our order number in
 * invoice_id (set at create); refund events carry invoice_id plus an "up"
 * link to the refunded capture; CHECKOUT.ORDER.APPROVED carries the PayPal
 * order id as the resource id itself.
 */
describe('extractEventOrderKeys', () => {
  it('reads the PayPal order id from an APPROVED event resource', () => {
    const keys = extractEventOrderKeys({
      event_type: 'CHECKOUT.ORDER.APPROVED',
      resource: { id: '5O190127TN364715T', intent: 'CAPTURE' }
    });
    expect(keys.paypalOrderId).toBe('5O190127TN364715T');
  });

  it('reads order id, invoice and capture id from a capture event', () => {
    const keys = extractEventOrderKeys({
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      resource: {
        id: '3C679366HH908993F',
        invoice_id: '10021',
        supplementary_data: {
          related_ids: { order_id: '5O190127TN364715T' }
        }
      }
    });
    expect(keys.paypalOrderId).toBe('5O190127TN364715T');
    expect(keys.invoiceNumber).toBe('10021');
    expect(keys.captureId).toBe('3C679366HH908993F');
  });

  it('resolves the capture id of a refund event from its up link', () => {
    const keys = extractEventOrderKeys({
      event_type: 'PAYMENT.CAPTURE.REFUNDED',
      resource: {
        id: '1JU08902781691411',
        invoice_id: '10021',
        links: [
          {
            rel: 'self',
            href: 'https://api.paypal.com/v2/payments/refunds/1JU08902781691411'
          },
          {
            rel: 'up',
            href: 'https://api.paypal.com/v2/payments/captures/3C679366HH908993F'
          }
        ]
      }
    });
    expect(keys.captureId).toBe('3C679366HH908993F');
    expect(keys.invoiceNumber).toBe('10021');
  });

  it('tolerates missing fields', () => {
    expect(extractEventOrderKeys({ event_type: 'PAYMENT.CAPTURE.DENIED' })).toEqual({
      paypalOrderId: undefined,
      invoiceNumber: undefined,
      captureId: undefined
    });
  });
});
