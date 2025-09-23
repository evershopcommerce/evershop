import Area from '@components/common/Area.js';
import { useCategory } from '@components/frontStore/category/categoryContext.js';
import {
  ProductFilter,
  DefaultProductFilterRenderer
} from '@components/frontStore/ProductFilter.js';
import React from 'react';
import { _ } from '../../../lib/locale/translate/_.js';

export function Filter() {
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
