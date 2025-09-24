import Area from '@components/common/Area.js';
import { useCategory } from '@components/frontStore/catalog/categoryContext.js';
import { ProductList } from '@components/frontStore/catalog/ProductList.js';
import React from 'react';
import { _ } from '../../../lib/locale/translate/_.js';

export function CategoryProducts() {
  const { showProducts, products } = useCategory();
  if (!showProducts) {
    return null;
  }
  return (
    <>
      <Area
        id="categoryProductsBefore"
        className="category__products__before"
      />
      <div>
        <ProductList
          products={products.items}
          layout="grid"
          gridColumns={3}
          showAddToCart={true}
        />
        <span className="product-count italic block mt-5">
          {_('${count} products', { count: products.total.toString() })}
        </span>
      </div>
      <Area id="categoryProductsAfter" className="category__products__after" />
    </>
  );
}
