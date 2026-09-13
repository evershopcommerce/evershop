import { ProductSingleAttributes } from '@components/frontStore/catalog/ProductSingleAttributes.js';
import React from 'react';

/**
 * Product page block: the attribute list. A page component rather than an inline entry of the
 * `ProductView` shell so a theme can move it from `layouts.json`. It reads `ProductProvider`,
 * so it must stay inside the product page shell's Areas; placed elsewhere it throws.
 * Default slot: under the price in the buy box (re-skin 2026-07-10, reference order).
 */
export default function ProductAttributesBlock(): React.ReactElement {
  return <ProductSingleAttributes />;
}

export const layout = {
  areaId: 'productSinglePageForm',
  sortOrder: 7
};
