import Handlebars from 'handlebars';
import { describe, expect, it } from '@jest/globals';
import { interpolate } from '../../../../lib/locale/interpolate.js';
import { registerEmailTemplates } from '../../../../lib/mail/templates/index.js';
import { decorateAddressForEmail } from '../../services/addressEmailData.js';
import { TEMPLATE as CREATED } from '../../subscribers/shipment_created/sendShipmentCreatedEmail.js';
import { TEMPLATE as DELIVERED } from '../../subscribers/shipment_delivered/sendShipmentDeliveredEmail.js';

/**
 * The shipment emails print the delivery address the same way the order
 * confirmation does: `formatted`, every line, nothing named by column. A
 * shipment whose order has no address (zero-total pickup) prints no block.
 */
function makeHbs() {
  const hbs = Handlebars.create();
  hbs.registerHelper('currency', (v: unknown) => `$${Number(v).toFixed(2)}`);
  hbs.registerHelper('date', (v: unknown) => String(v));
  registerEmailTemplates(hbs, {
    translate: (text: string, values?: Record<string, string>) => interpolate(text, values ?? {})
  });
  return hbs;
}

const ROW = {
  order_address_id: 1,
  uuid: 'a1',
  recipient: 'Chan Tai Man',
  telephone: '+85291234567',
  address_line_1: '1 Nathan Road',
  locality: 'Tsim Sha Tsui',
  administrative_area: 'Kowloon',
  country: 'HK',
  extra: null
};
const base = {
  order: { order_number: 1002, created_at: '2026-10-02', uuid: 'o-1' },
  shipment: { tracking_number: 'TRK123' },
  items: [{ qty: 1, product_name: 'Waxed Tote', product_sku: 'TOTE' }],
  carrierName: 'Base',
  trackingUrl: 'https://example.com/track/TRK123',
  trackOrderUrl: 'https://example.com/orders/o-1',
  deliveredOn: '2026-10-03'
};

describe('shipment emails print the delivery address', () => {
  it('shipment created: "Shipping to" with every formatted line', async () => {
    const html = makeHbs().compile(CREATED)(
      { ...base, shippingAddress: await decorateAddressForEmail(ROW, 'en') },
      { data: { locale: 'en' } }
    );
    expect(html).toContain('Shipping to');
    expect(html).toContain('Chan Tai Man<br>1 Nathan Road<br>Tsim Sha Tsui<br>Kowloon<br>Hong Kong SAR China<br>');
    expect(html).toContain('TRK123');
    expect(html).not.toContain('undefined');
  });

  it('shipment delivered: "Delivered to" with the same lines', async () => {
    const html = makeHbs().compile(DELIVERED)(
      { ...base, shippingAddress: await decorateAddressForEmail(ROW, 'en') },
      { data: { locale: 'en' } }
    );
    expect(html).toContain('Delivered to');
    expect(html).toContain('Chan Tai Man<br>1 Nathan Road<br>Tsim Sha Tsui<br>Kowloon<br>Hong Kong SAR China<br>');
    expect(html).not.toContain('undefined');
  });

  it('prints no address block when the order has none', () => {
    const html = makeHbs().compile(CREATED)({ ...base, shippingAddress: null }, { data: { locale: 'en' } });
    expect(html).not.toContain('Shipping to');
    expect(html).not.toContain('undefined');
  });
});
