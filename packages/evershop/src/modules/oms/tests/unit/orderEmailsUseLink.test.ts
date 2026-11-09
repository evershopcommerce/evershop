import { jest, describe, it, expect, beforeAll } from '@jest/globals';

/**
 * The order confirmation, shipment created and shipment delivered emails take
 * their "View your order" link from getOrderEmailLink (built from the routes)
 * and no longer write it by hand. Any one of them going back to a hand-made
 * link would pass every other test, since the strings are identical today; it
 * would only show once a route's path changes. getOrderEmailLink is replaced
 * with a marker; the real subscribers run over a stand-in pool, and the data
 * each hands to its `<email>EmailData` registry value is captured.
 */
const now = new Date('2026-11-01T10:00:00Z');
const rows: Record<string, Record<string, unknown>[]> = {
  order: [
    {
      order_id: 1,
      uuid: 'order-1',
      order_number: '1001',
      customer_email: 'jane@example.com',
      customer_full_name: 'Jane',
      currency: 'USD',
      grand_total: '10.0000',
      shipping_address_id: null,
      billing_address_id: null,
      created_at: now
    }
  ],
  order_item: [
    {
      order_item_id: 1,
      order_item_order_id: 1,
      product_name: 'Tee',
      product_sku: 'TEE',
      qty: 1,
      thumbnail: null,
      final_price: '10.0000'
    }
  ],
  shipment: [
    {
      shipment_id: 1,
      uuid: 'shipment-1',
      shipment_order_id: 1,
      carrier: null,
      tracking_number: null,
      shipped_at: now,
      delivered_at: now,
      created_at: now
    }
  ],
  shipment_item: [
    { shipment_item_id: 1, shipment_id: 1, order_item_id: 1, qty: 1 }
  ]
};
const fakePool = {
  async query(sql: string | { text: string }) {
    const text = typeof sql === 'string' ? sql : sql.text;
    const table = /FROM\s+"?(\w+)"?/i.exec(text)?.[1] ?? '';
    return { rows: (rows[table] ?? []).map((row) => ({ ...row })) };
  },
  release() {}
};

jest.unstable_mockModule('../../../../lib/postgres/connection.js', () => ({
  pool: fakePool,
  getConnection: async () => fakePool
}));
jest.unstable_mockModule('../../services/orderEmailLink.js', () => ({
  getOrderEmailLink: (uuid: string) => `LINK-FROM-ROUTES:${uuid}`
}));
jest.unstable_mockModule('../../../../lib/log/logger.js', () => ({
  debug: () => undefined,
  info: () => undefined,
  warning: () => undefined,
  error: () => undefined,
  success: () => undefined
}));

const { addProcessor } = await import('../../../../lib/util/registry.js');
const { default: sendOrderConfirmationEmail } = await import(
  '../../subscribers/order_placed/sendOrderConfirmationEmail.js'
);
const { default: sendShipmentCreatedEmail } = await import(
  '../../subscribers/shipment_created/sendShipmentCreatedEmail.js'
);
const { default: sendShipmentDeliveredEmail } = await import(
  '../../subscribers/shipment_delivered/sendShipmentDeliveredEmail.js'
);

const captured: Record<string, Record<string, unknown>> = {};
beforeAll(() => {
  for (const name of [
    'orderConfirmationEmailData',
    'shipmentCreatedEmailData',
    'shipmentDeliveredEmailData'
  ]) {
    addProcessor(name, (data: Record<string, unknown>) => {
      captured[name] = data;
      return data;
    });
  }
});

describe('the order emails take their link from getOrderEmailLink', () => {
  it('order confirmation: orderUrl', async () => {
    await sendOrderConfirmationEmail({
      order_id: 1,
      uuid: 'order-1',
      customer_email: 'jane@example.com'
    } as never);
    expect(captured.orderConfirmationEmailData?.orderUrl).toBe(
      'LINK-FROM-ROUTES:order-1'
    );
  });

  it('shipment created: trackOrderUrl', async () => {
    await sendShipmentCreatedEmail({
      shipmentId: 1,
      orderId: 1,
      notifyCustomer: true
    } as never);
    expect(captured.shipmentCreatedEmailData?.trackOrderUrl).toBe(
      'LINK-FROM-ROUTES:order-1'
    );
  });

  it('shipment delivered: trackOrderUrl', async () => {
    await sendShipmentDeliveredEmail({
      shipmentId: 1,
      orderId: 1,
      notifyCustomer: true
    } as never);
    expect(captured.shipmentDeliveredEmailData?.trackOrderUrl).toBe(
      'LINK-FROM-ROUTES:order-1'
    );
  });
});
