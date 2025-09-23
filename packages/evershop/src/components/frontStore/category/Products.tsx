import { useCategory } from '@components/frontStore/category/categoryContext.js';
import { ProductList } from '@components/frontStore/ProductList.js';
import React from 'react';
import { _ } from '../../../lib/locale/translate/_.js';

export function Products() {
  const { showProducts, products } = useCategory();
  if (!showProducts) {
    return null;
  }
  return (
    <div>
      <ProductList
        products={products.items}
        layout="grid"
        gridColumns={3}
        showAddToCart={true}
      />
      <span className="product-count italic block mt-5">
        {_('${count} products', { count: products.items.length.toString() })}
      </span>
    </div>
  );
}
