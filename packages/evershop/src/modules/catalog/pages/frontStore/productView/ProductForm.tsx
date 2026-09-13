import { ProductSingleForm } from '@components/frontStore/catalog/ProductSingleForm.js';
import React from 'react';

/**
 * Product page block: the buy box (variant selector, quantity, add to cart). A page component rather than an inline entry of the
 * `ProductView` shell so a theme can move it from `layouts.json`. It reads `ProductProvider`,
 * so it must stay inside the product page shell's Areas; placed elsewhere it throws.
 * The price and attribute blocks render inside it, in its `productSinglePageForm` Area.
 */
export default function ProductFormBlock(): React.ReactElement {
  return <ProductSingleForm />;
}

export const layout = {
  areaId: 'productPageMiddleRight',
  sortOrder: 30
};
