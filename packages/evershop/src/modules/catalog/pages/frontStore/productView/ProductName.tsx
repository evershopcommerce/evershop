import { ProductSingleName } from '@components/frontStore/catalog/ProductSingleName.js';
import React from 'react';

/**
 * Product page block: the product name. A page component rather than an inline entry of the
 * `ProductView` shell so a theme can move it from `layouts.json`. It reads `ProductProvider`,
 * so it must stay inside the product page shell's Areas; placed elsewhere it throws.
 */
export default function ProductNameBlock(): React.ReactElement {
  return <ProductSingleName />;
}

export const layout = {
  areaId: 'productPageMiddleRight',
  sortOrder: 10
};
