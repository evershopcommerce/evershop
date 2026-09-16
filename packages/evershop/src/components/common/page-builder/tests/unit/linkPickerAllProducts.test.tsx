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
