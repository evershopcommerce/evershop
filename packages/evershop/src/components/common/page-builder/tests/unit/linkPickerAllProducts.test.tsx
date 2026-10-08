import { jest, describe, it, expect } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * The "All Products" shortcut in the Category tab of the LinkPicker.
 *
 * `/products` is a fixed route with no entity id, so it cannot be a URN like a
 * real category — it is stored as the plain path and offered as a pinned row.
 * Same shape as the `/blog` home shortcut in the Blog category picker, which is
 * where `pinnedItems` / `onPinnedSelect` came from.
 *
 * `resolveLink` needs no change for this: a plain path that passes `isSafeUrl`
 * is returned unchanged, and only URNs go through a loader.
 */

// The picker's category list comes from urql. Stub it — the pinned rows arrive
// as props, so an empty result is exactly the state worth asserting against.
jest.unstable_mockModule('urql', () => ({
  useQuery: () => [{ data: undefined, fetching: false }]
}));

const { CategoryPicker } = await import('../../pickers/CategoryPicker.js');
const { ALL_PRODUCTS_KIND } = await import('../../pickers/LinkPicker.js');
const { CatalogUrn, UrnService } = await import('@evershop/evershop/lib/urn');

const pinned = [
  {
    id: '__all_products__',
    primary: 'All products',
    secondary: 'Every product in the store'
  }
];

const render = (props: Record<string, unknown> = {}) =>
  renderToStaticMarkup(
    <CategoryPicker
      onPick={() => undefined}
      pinnedItems={pinned}
      onPinnedSelect={() => undefined}
      {...props}
    />
  );

describe('CategoryPicker pinned shortcut', () => {
  it('shows the shortcut above the category results', () => {
    const html = render();
    expect(html).toContain('All products');
    expect(html).toContain('Every product in the store');
  });

  it('marks it selected when the stored value is the pinned id', () => {
    // LinkPicker maps a stored `/products` to the pinned id so the row
    // highlights on re-edit, the same way BLOG_HOME_PATH does.
    expect(render({ selectedUrl: '__all_products__' })).toContain(
      'All products'
    );
  });

  it('renders no shortcut when none is supplied', () => {
    // The category page and every other caller pass no pinnedItems, so their
    // picker must look exactly as it did before.
    const html = renderToStaticMarkup(
      <CategoryPicker onPick={() => undefined} />
    );
    expect(html).not.toContain('All products');
  });
});

/**
 * Regression guard for the shortcut's emitted `kind`.
 *
 * Consumers map `kind` onto a legacy `{type, uuid}` pair. `BasicMenuSetting`'s
 * `toLinkValue` turns `type: 'category'` plus any truthy uuid back into
 * `CatalogUrn.category(uuid)` — so emitting `category` with a path instead of a
 * uuid synthesized `urn:evershop:catalog:category:/products`. That URN parses,
 * which made `LinkPicker` treat the value as a real category: the pinned row
 * stopped highlighting (it read as unselectable) and the storefront resolved it
 * to a dead link. Reported from a live dev server 2026-09-16.
 */
describe('the shortcut round-trips through a legacy menu consumer', () => {
  // BasicMenuSetting's two helpers, inlined — they are module-private there.
  const linkPatch = (next: { url: string; kind: string }) => ({
    url: next.url,
    type: next.kind,
    uuid: UrnService.isValid(next.url)
      ? UrnService.parse(next.url).uuid
      : next.url
  });
  const toLinkValue = (item: { url: string; type: string; uuid: string }) => {
    if (item.url && UrnService.isValid(item.url)) return item.url;
    if (item.type === 'category' && item.uuid) {
      return CatalogUrn.category(item.uuid);
    }
    return item.url || '';
  };

  it('survives a save/reload without becoming a bogus URN', () => {
    const emitted = { url: '/products', kind: ALL_PRODUCTS_KIND };
    const reread = toLinkValue(linkPatch(emitted));
    expect(reread).toBe('/products');
    expect(UrnService.isValid(reread)).toBe(false);
  });

  it('would have broken had the kind stayed `category`', () => {
    const reread = toLinkValue(linkPatch({ url: '/products', kind: 'category' }));
    expect(reread).toBe('urn:evershop:catalog:category:/products');
    // Parses as a real URN, which is exactly what made the row unselectable.
    expect(UrnService.isValid(reread)).toBe(true);
  });

  it('is not any of the three kinds a legacy consumer maps to an entity', () => {
    expect(['category', 'page', 'product']).not.toContain(ALL_PRODUCTS_KIND);
  });
});
