import { jest, describe, it, expect } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * Settings → Customer: one card, sections in Area `customerSettingSections`,
 * the Addresses section first. The seven controls post the exact row names
 * the resolver reads; the sell-to list is NOT here (it lives with the
 * shipping zones).
 */
jest.unstable_mockModule('urql', () => ({ useQuery: () => [{ data: undefined, fetching: false, error: undefined }] }));
const { AppProvider } = await import('../../../../components/common/context/app.js');
const CustomerSetting = (await import('../../pages/admin/customerSetting/CustomerSetting.js')).default;
const { layout, query } = await import('../../pages/admin/customerSetting/CustomerSetting.js');
const menu = await import('../../pages/admin/all/CustomerSettingMenu.js');

const setting = {
  addressNameFormat: 'single',
  addressTelephone: 'required',
  addressOrganization: 'optional',
  addressLine2: 'shown',
  addressLine3: 'disabled',
  addressRequired: { postal_code: 'required' },
  addressDefaultCountry: 'store'
};
const html = renderToStaticMarkup(
  <AppProvider value={{ config: { pageMeta: { route: { id: 'customerSetting' } } }, widgets: [], propsMap: {} } as unknown as React.ComponentProps<typeof AppProvider>['value']}>
    <CustomerSetting saveSettingApi="/api/settings" countries={[{ code: 'US', name: 'United States' }, { code: 'VN', name: 'Vietnam' }]} setting={setting} />
  </AppProvider>
);

describe('Settings → Customer page', () => {
  it('registers under content with its menu item after Store Setting', () => {
    expect(layout).toEqual({ areaId: 'content', sortOrder: 10 });
    expect(menu.layout).toEqual({ areaId: 'settingPageMenu', sortOrder: 6 });
    expect(menu.query).toContain('routeId: "customerSetting"');
    for (const row of ['addressNameFormat', 'addressTelephone', 'addressOrganization', 'addressLine2', 'addressLine3', 'addressRequired', 'addressDefaultCountry']) {
      expect(query).toContain(row);
    }
    expect(query).not.toContain('addressSellToCountries');
    expect(query).toContain('countries(scope: ALL)');
  });

  it('renders the Addresses section with one control per row and no sell-to list', () => {
    expect(html).toContain('Customer Settings');
    expect(html).toContain('>Addresses<');
    expect(html).toContain('data-evershop-area-id="customerAddressSetting"');
    for (const name of ['addressNameFormat', 'addressTelephone', 'addressOrganization', 'addressLine2', 'addressLine3', 'addressDefaultCountry']) {
      expect(html).toContain(`field-${name}`);
    }
    for (const f of ['locality', 'administrative_area', 'postal_code', 'dependent_locality', 'address_line_2']) {
      expect(html).toContain(`field-addressRequired.${f}`);
    }
    expect(html).not.toContain('addressSellToCountries');
    expect(html).toContain('Save Settings');
  });
});
