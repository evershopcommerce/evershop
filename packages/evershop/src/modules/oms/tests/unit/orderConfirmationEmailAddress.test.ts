import Handlebars from 'handlebars';
import { describe, expect, it } from '@jest/globals';
import { interpolate } from '../../../../lib/locale/interpolate.js';
import { registerEmailTemplates } from '../../../../lib/mail/templates/index.js';
import { decorateAddressForEmail } from '../../services/addressEmailData.js';
import { TEMPLATE } from '../../subscribers/order_placed/sendOrderConfirmationEmail.js';

/**
 * The order confirmation email prints `formatted` (spec § 3.6): line 2 and the
 * country are no longer dropped (§ 1.2 #8). A fresh Handlebars environment,
 * as in lib/mail/tests/unit/emailTemplates.test.js — no settings, no DB.
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
  recipient: 'Jane Smith',
  telephone: '+16502530000',
  address_line_1: '1600 Amphitheatre Pkwy',
  address_line_2: 'Suite 200',
  locality: 'Mountain View',
  administrative_area: 'US-CA',
  postal_code: '94043',
  country: 'US',
  extra: null
};

describe('order confirmation email address data', () => {
  it('decorates the row with formatted lines and derived names, under the new column names', async () => {
    const data = await decorateAddressForEmail(ROW, 'en');
    expect(data.formatted).toEqual([
      'Jane Smith',
      '1600 Amphitheatre Pkwy',
      'Suite 200',
      'Mountain View, California 94043',
      'United States'
    ]);
    expect(data).toMatchObject({
      administrative_area: 'US-CA',
      administrative_area_name: 'California',
      locality_name: 'Mountain View',
      dependent_locality_name: null,
      country_name: 'United States'
    });
    expect(data).not.toHaveProperty('province_name');
  });

  it('the default template prints every formatted line — line 2 and the country included', async () => {
    const hbs = makeHbs();
    const html = hbs.compile(TEMPLATE)(
      {
        order: {
          order_number: 1001,
          created_at: '2026-10-02',
          sub_total: 68,
          shipping_fee_incl_tax: 0,
          grand_total: 68,
          items: [{ product_name: 'Waxed Tote', qty: 1, final_price: 68 }]
        },
        orderUrl: 'https://example.com/orders/abc',
        shippingAddress: await decorateAddressForEmail(ROW, 'en'),
        billingAddress: null
      },
      { data: { locale: 'en' } }
    );
    expect(html).toContain('Shipping to');
    expect(html).toContain('Jane Smith<br>1600 Amphitheatre Pkwy<br>Suite 200<br>Mountain View, California 94043<br>United States<br>');
    expect(html).not.toContain('undefined');
  });
});
