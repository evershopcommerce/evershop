import { useProduct } from '@components/frontStore/catalog/ProductContext.js';
import React from 'react';

/**
 * Price row of the product page (special price with the regular price struck
 * through, or the regular price alone). Was inline in `ProductSingleForm`;
 * now a shared component so themes can override it through `@components`
 * and the `productView/ProductPrice` block can move it.
 */
export function ProductSinglePrice() {
  const { price } = useProduct();
  return (
    <div className="product__single__price flex items-baseline gap-3">
      {price.special && price.special.value < price.regular.value ? (
        <>
          <span className="text-2xl font-semibold">{price.special.text}</span>
          <span className="text-lg text-muted-foreground line-through">
            {price.regular.text}
          </span>
        </>
      ) : (
        <span className="text-2xl font-semibold">{price.regular.text}</span>
      )}
    </div>
  );
}
