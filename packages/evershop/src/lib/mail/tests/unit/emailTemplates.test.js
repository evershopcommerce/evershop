import Handlebars from 'handlebars';
import { interpolate } from '../../../locale/interpolate.js';
import { registerEmailTemplates } from '../../templates/index.js';

// A fresh Handlebars environment per test so the shared layer is exercised in
// isolation (no global pollution, no settings/DB). `currency`/`date` are stubbed
// because the partials use them; `translate` marks the locale and runs the real
// interpolation rule so the assertions can prove both locale threading and
// ${var} substitution.
function makeHbs() {
  const hbs = Handlebars.create();
  hbs.registerHelper('currency', (v) => `$${Number(v).toFixed(2)}`);
  hbs.registerHelper('date', (v) => String(v));
  const translate = (text, values, locale) => `${locale}|${interpolate(text, values)}`;
  registerEmailTemplates(hbs, { translate });
  return hbs;
}

const DATA = {
  storeInfo: {
    storeName: 'Field Supply',
    storeEmail: 'help@field.example',
    homeUrl: 'https://field.example',
    logo: {
      src: 'https://field.example/logo.png',
      alt: 'Field',
      width: '180',
      height: '60'
    },
    address: {
      street: '214 Mill St',
      city: 'Portland',
      province: 'OR',
      postalCode: '97204',
      country: 'United States'
    }
  },
  brand: { accentColor: '#123456' },
  order: {
    order_number: 10042,
    items: [
      {
        product_name: 'Waxed Tote',
        qty: 1,
        final_price: 68,
        thumbnail: 'https://field.example/t.png'
      }
    ]
  },
  orderUrl: 'https://field.example/orders/abc'
};

const render = (hbs, tpl, locale = 'vi') =>
  hbs.compile(tpl)(DATA, { data: { locale } });

describe('email layout + partials', () => {
  it('composes the shared chrome: bounded logo, store name, footer address', () => {
    const out = render(makeHbs(), `{{#> emailLayout}}<p>body</p>{{/emailLayout}}`);
    expect(out).toContain('Field Supply');
    expect(out).toContain('width="180" height="60"'); // logo fits its box
    expect(out).toContain('214 Mill St, Portland, OR 97204'); // province/postalCode, not state/zip
    expect(out).toContain('<p>body</p>'); // content slot rendered
    expect(out).not.toContain('undefined');
  });

  it('translates copy and threads the render locale', () => {
    const out = render(
      makeHbs(),
      `{{#> emailLayout}}<h1>{{t "Your order is confirmed"}}</h1>{{/emailLayout}}`
    );
    expect(out).toContain('vi|Your order is confirmed');
  });

  it('interpolates \${var} through the t helper', () => {
    const out = render(
      makeHbs(),
      `{{#> emailLayout}}<p>{{t "Order #\${number}" number=order.order_number}}</p>{{/emailLayout}}`
    );
    expect(out).toContain('vi|Order #10042');
  });

  it('coerces a missing interpolation value to empty, never "undefined"', () => {
    const out = render(
      makeHbs(),
      `{{#> emailLayout}}<p>{{t "Hi \${name}." name=order.missing}}</p>{{/emailLayout}}`
    );
    expect(out).toContain('vi|Hi .');
    expect(out).not.toContain('undefined');
  });

  it('button takes the brand accent color', () => {
    const out = render(
      makeHbs(),
      `{{#> emailLayout}}{{> button href=orderUrl label=(t "View your order")}}{{/emailLayout}}`
    );
    expect(out).toContain('background:#123456');
    expect(out).toContain('vi|View your order');
    expect(out).toContain('href="https://field.example/orders/abc"');
  });

  it('itemsTable renders each line with a bounded thumbnail and price', () => {
    const out = render(
      makeHbs(),
      `{{#> emailLayout}}{{> itemsTable}}{{/emailLayout}}`
    );
    expect(out).toContain('Waxed Tote');
    expect(out).toContain('src="https://field.example/t.png"');
    expect(out).toContain('width="48" height="48"'); // thumbnail fits its box
    expect(out).toContain('vi|Qty');
    expect(out).toContain('$68.00');
  });

  // The refund email interpolates a formatted amount into a translated sentence
  // via a currency subexpression as a `t` hash value: {{t "…${amount}…"
  // amount=(currency refund.amount)}}. Prove the subexpression result flows
  // through the t helper as a string (not "[object Object]" / "undefined").
  it('accepts a helper subexpression (currency) as a t interpolation value', () => {
    const out = render(
      makeHbs(),
      `{{#> emailLayout}}<p>{{t "Refunded \${amount} total." amount=(currency 40)}}</p>{{/emailLayout}}`
    );
    expect(out).toContain('vi|Refunded $40.00 total.');
    expect(out).not.toContain('undefined');
    expect(out).not.toContain('[object Object]');
  });
});
