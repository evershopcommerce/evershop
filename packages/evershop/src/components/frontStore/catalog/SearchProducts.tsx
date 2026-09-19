import { Area } from '@components/common/index.js';
import { ProductList } from '@components/frontStore/catalog/ProductList.js';
import { useSearch } from '@components/frontStore/catalog/SearchContext.js';
import React from 'react';

export function SearchProducts() {
  const { products } = useSearch();

  return (
    <>
      <Area id="searchProductsBefore" noOuter />
      {/* Re-skin (2026-07-10): 4-col grid (reference); the result count moved
          into the SearchInfo heading, so no separate italic count line. */}
      <ProductList
        products={products.items}
        layout="grid"
        gridColumns={4}
        showAddToCart={true}
      />
      <Area id="searchProductsAfter" noOuter />
    </>
  );
}
