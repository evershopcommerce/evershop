import { jest, describe, it, expect, afterEach } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * "Allow guest checkout" lives on Settings → Customer, as a Checkout section
 * the checkout module adds to Area `customerSettingSections`. It is inside the
 * page form, so the toggle posts with the page's Save button, and Store
 * Settings no longer has a Checkout section.
 */
jest.unstable_mockModule('urql', () => ({
  useClient: () => ({}),
  useQuery: (opts: { query: string }) => [
    {
      data: opts.query.includes('countries(')
        ? { countries: [{ code: 'US', name: 'United States' }] }
        : { regions: [], addressConfigWarnings: [] },
      fetching: false,
      error: undefined
    }
  ]
}));
const { AppProvider } = await import('../../../../components/common/context/app.js');
const { setAreaComponents } = await import('../../../../components/common/Area.js');
const guestCheckout = await import('../../pages/admin/customerSetting/GuestCheckoutSetting.js');
const CustomerSetting = (await import('../../../setting/pages/admin/customerSetting/CustomerSetting.js')).default;
const storeSetting = await import('../../../setting/pages/admin/storeSetting/StoreSetting.js');

const GuestCheckoutSetting = guestCheckout.default;
type AppValue = React.ComponentProps<typeof AppProvider>['value'];
const app = (routeId: string) =>
  ({ config: { pageMeta: { route: { id: routeId } } }, widgets: [], propsMap: {} }) as unknown as AppValue;

const addressSetting = {
  addressNameFormat: 'single',
  addressTelephone: 'required',
  addressOrganization: 'optional',
  addressLine2: 'shown',
  addressLine3: 'disabled',
  addressRequired: {},
  addressDefaultCountry: 'store'
};

/** Settings → Customer with the checkout module's section registered, as the route bundle does. */
function customerPage(allowGuestCheckout: boolean | null) {
  setAreaComponents('customerSetting', {
    customerSettingSections: {
      guestCheckout: {
        id: 'guestCheckout',
        sortOrder: guestCheckout.layout.sortOrder,
        component: { default: GuestCheckoutSetting },
        props: { setting: { allowGuestCheckout } }
      }
    }
  } as unknown as Parameters<typeof setAreaComponents>[1]);
  return renderToStaticMarkup(
    <AppProvider value={app('customerSetting')}>
      <CustomerSetting saveSettingApi="/api/settings" countries={[]} setting={addressSetting} />
    </AppProvider>
  );
}

/** The toggle's switch: `aria-checked` says whether guest checkout is on. */
const switchOf = (html: string) => html.match(/<[^>]*role="switch"[^>]*>/)?.[0] ?? '';

describe('Allow guest checkout on Settings → Customer', () => {
  afterEach(() => setAreaComponents('customerSetting', {}));

  it('is a Checkout section in the customer settings sections, before Addresses', () => {
    expect(guestCheckout.layout).toEqual({ areaId: 'customerSettingSections', sortOrder: 5 });
    expect(guestCheckout.query).toContain('allowGuestCheckout');
  });

  it('renders inside the customer settings form, above Addresses', () => {
    const html = customerPage(false);
    const formStart = html.indexOf('<form');
    const toggle = html.indexOf('field-allowGuestCheckout');
    const addresses = html.indexOf('>Addresses<');
    expect(html).toContain('>Checkout<');
    expect(html).toContain('Allow guest checkout');
    expect(formStart).toBeGreaterThan(-1);
    expect(toggle).toBeGreaterThan(formStart);
    expect(toggle).toBeLessThan(addresses);
    expect(toggle).toBeLessThan(html.indexOf('</form>'));
    expect(html.slice(formStart, toggle)).toContain('id="customerSetting"');
  });

  it('shows the saved value, and "on" when nothing is saved', () => {
    expect(switchOf(customerPage(false))).toContain('aria-checked="false"');
    expect(switchOf(customerPage(true))).toContain('aria-checked="true"');
    expect(switchOf(customerPage(null))).toContain('aria-checked="true"');
  });
});

describe('Store Settings', () => {
  it('no longer asks for or shows the guest-checkout toggle', () => {
    expect(storeSetting.query).not.toContain('allowGuestCheckout');
    const html = renderToStaticMarkup(
      <AppProvider value={app('storeSetting')}>
        <storeSetting.default
          saveSettingApi="/api/settings"
          timezones={[]}
          currencies={[]}
          setting={{ storeCountry: 'US' } as React.ComponentProps<typeof storeSetting.default>['setting']}
        />
      </AppProvider>
    );
    expect(html).toContain('Store Settings');
    expect(html).not.toContain('allowGuestCheckout');
    expect(html).not.toContain('>Checkout<');
  });
});
