import Area from '@components/common/Area.js';
import { useCategory } from '@components/frontStore/catalog/categoryContext.js';
import {
  ProductFilter,
  DefaultProductFilterRenderer
} from '@components/frontStore/catalog/ProductFilter.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export function CategoryProductsFilter() {
  const category = useCategory();
  return (
    <>
      <Area id="beforeFilter" noOuter />
      <ProductFilter
        currentFilters={category.products.currentFilters}
        availableAttributes={category.availableAttributes}
        categories={category.children}
        priceRange={category.priceRange}
      >
        {(renderProps) => (
          <DefaultProductFilterRenderer
            renderProps={renderProps}
            title="Product Filters"
            className="my-custom-class"
            showFilterSummary={true}
          />
        )}
      </ProductFilter>
      <Area id="afterFilter" noOuter />
    </>
  );
}
