import '../../../../components/frontStore/customer/address/tests/unit/domSetup.js';
import { describe, expect, it, beforeEach } from '@jest/globals';

/**
 * `GoogleAnalyticsHead.tsx`, a storefront `head` area component, loads GA4:
 * - production: the server renders the head script in the page head, and
 *   nothing without a valid Measurement ID;
 * - after `HeadTags` (the merchant's head scripts, where a cookie banner
 *   goes), so the banner runs first;
 * - development (the browser draws the head, and a script React adds does
 *   not run): the component adds the script once, and not when the page has
 *   loaded GA4 already.
 */
const React = (await import('react')).default;
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { renderToStaticMarkup } = await import('react-dom/server');
const { default: GoogleAnalyticsHead, layout } = await import(
  '../../pages/frontStore/all/GoogleAnalyticsHead.js'
);
const { layout: headTagsLayout } = await import(
  '../../pages/frontStore/all/HeadTags.js'
);
const { googleAnalyticsHeadScript } = await import(
  '../../../../components/frontStore/googleAnalytics/googleAnalyticsHead.js'
);

const w = window as unknown as Record<string, unknown>;
const element = (gaMeasurementId: unknown, gaConsentDefault: unknown = 'granted') => (
  <GoogleAnalyticsHead
    setting={{ gaMeasurementId, gaConsentDefault } as never}
  />
);
const gaScripts = () =>
  Array.from(document.head.querySelectorAll('script')).filter((s) =>
    s.text.includes('googletagmanager.com/gtag/js')
  );

describe('GA4 in the storefront head (production: rendered by the server)', () => {
  it('the head script, with the consent default when the store waits for consent', () => {
    for (const consent of ['granted', 'denied']) {
      expect(renderToStaticMarkup(element('G-TEST123', consent))).toBe(
        `<script>${googleAnalyticsHeadScript('G-TEST123', consent)}</script>`
      );
    }
    expect(renderToStaticMarkup(element('G-TEST123', 'denied'))).toContain(
      "gtag('consent','default'"
    );
  });

  it('nothing without a valid Measurement ID', () => {
    for (const id of ['', null, undefined, 'UA-12345-1', 'GTM-K28SK32L', "G-1');alert(1)//"]) {
      expect(renderToStaticMarkup(element(id))).toBe('');
    }
  });

  it('in the head area, after HeadTags: a cookie banner among the head scripts runs first', () => {
    expect(layout.areaId).toBe('head');
    expect(headTagsLayout.areaId).toBe('head');
    expect(layout.sortOrder).toBeGreaterThan(headTagsLayout.sortOrder);
  });
});

describe('GA4 in the storefront head (development: added by the browser)', () => {
  beforeEach(() => {
    gaScripts().forEach((s) => s.remove());
    delete w.__evershopGaLoaded;
  });

  const mount = async (node: React.ReactElement) => {
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(node);
    });
    return root;
  };

  it('adds the head script once to the page head', async () => {
    const root = await mount(element('G-TEST123', 'denied'));
    const added = gaScripts().filter((s) => s.parentNode === document.head);
    expect(added).toHaveLength(1);
    expect(added[0].text).toBe(googleAnalyticsHeadScript('G-TEST123', 'denied'));
    act(() => root.unmount());
  });

  it('adds nothing when the page has loaded GA4 already, or without a valid id', async () => {
    w.__evershopGaLoaded = 'G-TEST123';
    const loaded = await mount(element('G-TEST123'));
    expect(gaScripts()).toHaveLength(0);
    delete w.__evershopGaLoaded;
    const before = document.head.querySelectorAll('script').length;
    const invalid = await mount(element('UA-12345-1'));
    expect(document.head.querySelectorAll('script')).toHaveLength(before);
    act(() => loaded.unmount());
    act(() => invalid.unmount());
  });
});
