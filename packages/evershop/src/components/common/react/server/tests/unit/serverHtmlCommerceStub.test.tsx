import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * The production page head carries the commerce event stub on storefront
 * pages, before the head area (merchant scripts, theme tags), so a head
 * script can call `window.evershop.onCommerceEvent` at once. Admin pages
 * have no commerce events and get no stub.
 */
jest.unstable_mockModule('@components/common/Area.js', () => ({
  default: ({ id }: { id: string }) => <i data-area={`area-${id}`} />
}));
jest.unstable_mockModule('@components/common/modal/Alert.js', () => ({
  Alert: ({ children }: { children?: React.ReactNode }) => <>{children}</>
}));

const { default: ServerHtml } = await import('../../Server.js');
const { COMMERCE_EVENT_STUB } = await import('../../commerceEventStub.js');

const STUB_START = 'window.evershop = window.evershop || {}';

const head = (isAdmin: boolean) =>
  renderToStaticMarkup(
    <ServerHtml
      route={{ id: 'cart', isAdmin } as never}
      css={[]}
      js={[]}
      appContext="var eContext = {}"
    />
  );

describe('commerce event stub in the page head', () => {
  it('is on storefront pages, before the head area', () => {
    const html = head(false);
    const stub = html.indexOf(STUB_START);
    expect(COMMERCE_EVENT_STUB).toContain(STUB_START);
    expect(stub).toBeGreaterThan(-1);
    expect(stub).toBeLessThan(html.indexOf('area-head'));
  });

  it('is not on admin pages', () => {
    expect(head(true)).not.toContain(STUB_START);
  });
});
