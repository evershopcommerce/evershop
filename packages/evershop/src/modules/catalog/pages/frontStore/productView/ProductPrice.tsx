import { ProductSinglePrice } from '@components/frontStore/catalog/ProductSinglePrice.js';
import React from 'react';

/**
 * Product page block: the price row. A page component rather than an inline entry of the
 * `ProductView` shell so a theme can move it from `layouts.json`. It reads `ProductProvider`,
 * so it must stay inside the product page shell's Areas; placed elsewhere it throws.
 * Default slot: the top of the buy box.
 */
export default function ProductPriceBlock(): React.ReactElement {
  return <ProductSinglePrice />;
}

export const layout = {
  areaId: 'productSinglePageForm',
  sortOrder: 5
};
