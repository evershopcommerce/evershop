import { Area } from '@components/common/index.js';
import { ProductList } from '@components/frontStore/catalog/ProductList.js';
import { useSearch } from '@components/frontStore/catalog/SearchContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export function SearchProducts() {
  const { products } = useSearch();

  return (
    <>
      <Area id="searchProductsBefore" noOuter />
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
      <Area id="searchProductsAfter" noOuter />
    </>
  );
}
