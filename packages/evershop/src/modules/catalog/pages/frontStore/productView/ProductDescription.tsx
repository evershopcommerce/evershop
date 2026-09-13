import { ProductSingleDescription } from '@components/frontStore/catalog/ProductSingleDescription.js';
import React from 'react';

/**
 * Product page block: the description (with its `productDescriptionBefore` / `productDescriptionAfter` Areas). A page component rather than an inline entry of the
 * `ProductView` shell so a theme can move it from `layouts.json`. It reads `ProductProvider`,
 * so it must stay inside the product page shell's Areas; placed elsewhere it throws.
 */
export default function ProductDescriptionBlock(): React.ReactElement {
  return <ProductSingleDescription />;
}

export const layout = {
  areaId: 'productSingleDescription',
  sortOrder: 10
};
