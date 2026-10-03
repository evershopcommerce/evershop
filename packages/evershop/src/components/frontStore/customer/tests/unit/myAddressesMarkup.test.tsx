import { jest, describe, it, expect } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * The address book is server-rendered on /account. Its dialog triggers must be
 * ONE button each: `<DialogTrigger><Button/></DialogTrigger>` renders a
 * <button> inside a <button>, browsers un-nest that while parsing, and React
 * then fails hydration on every load (#418) and regenerates the whole page
 * client-side. Found 2026-10-02 with the production probe; fixed with the
 * `render` prop. This test keeps it fixed.
 */
jest.unstable_mockModule('urql', () => ({
  useQuery: () => [{ data: undefined, fetching: false, error: undefined }]
}));

const { AppProvider } = await import('../../../../common/context/app.js');
const { CustomerProvider } = await import('../../CustomerContext.js');
const { MyAddresses } = await import('../../MyAddresses.js');

const address = {
  uuid: 'a-1',
  isDefault: true,
  recipient: 'Chan Siu Ming',
  addressLine1: '88 Queensway',
  locality: { key: 'Admiralty', name: 'Admiralty' },
  administrativeArea: { key: 'Hong Kong Island', name: 'Hong Kong Island' },
  country: { code: 'HK', name: 'Hong Kong SAR China' },
  telephone: '+85291234567',
  extra: {},
  formatted: ['Chan Siu Ming', '88 Queensway', 'Admiralty', 'Hong Kong Island', 'Hong Kong SAR China']
};

const render = (addresses: unknown[]) =>
  renderToStaticMarkup(
    <AppProvider
      value={{ config: { pageMeta: { route: { id: 'account' } } }, widgets: [], propsMap: {} } as unknown as React.ComponentProps<typeof AppProvider>['value']}
    >
      <CustomerProvider
        loginAPI="/api/login"
        registerAPI="/api/register"
        logoutAPI="/api/logout"
        initialCustomer={{ customerId: 1, uuid: 'c-1', fullName: 'PR Four', email: 'pr4@example.com', groupId: 1, status: 1, addresses, orders: [] } as unknown as React.ComponentProps<typeof CustomerProvider>['initialCustomer']}
      >
        <MyAddresses />
      </CustomerProvider>
    </AppProvider>
  );

/** Offsets of <button> tags that open while another <button> is still open. */
function nestedButtons(html: string): number[] {
  const nested: number[] = [];
  let depth = 0;
  for (const tag of html.matchAll(/<(\/?)button\b[^>]*>/g)) {
    if (tag[1]) {
      depth = Math.max(0, depth - 1);
    } else {
      if (depth > 0) nested.push(tag.index ?? -1);
      depth += 1;
    }
  }
  return nested;
}

describe('MyAddresses server markup', () => {
  it('renders each dialog trigger as a single button (no <button> inside <button>)', () => {
    const html = render([address]);
    expect(html).toContain('Add new address');
    expect(html).toContain('Edit');
    expect(nestedButtons(html)).toEqual([]);
    // The trigger and the styled button are the same element: base-ui keeps
    // its own data-slot, the Button contributes its classes.
    const triggers = html.match(/<button[^>]*data-slot="dialog-trigger"[^>]*>/g) ?? [];
    expect(triggers.length).toBe(2);
    for (const tag of triggers) {
      expect(tag).toContain('group/button');
    }
    expect((html.match(/<button\b/g) ?? []).length).toBe(2);
  });

  it('prints the stored address from `formatted` plus the telephone', () => {
    const html = render([address]);
    for (const line of address.formatted) {
      expect(html).toContain(line);
    }
    expect(html).toContain('+85291234567');
    expect(nestedButtons(render([]))).toEqual([]);
  });
});
