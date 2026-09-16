import Area from '@components/common/Area.js';
import { DefaultProductFilterRender } from '@components/frontStore/catalog/DefaultProductFilterRender.js';
import { ProductFilter } from '@components/frontStore/catalog/ProductFilter.js';
import { useProductListing } from '@components/frontStore/catalog/ProductListingContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

/**
 * Filter sidebar for the all-products listing. Same headless `ProductFilter` as
 * the category page — it takes everything as props — fed from the listing
 * context instead of a category. `categories` is the whole enabled tree rather
 * than one level of children; the `cat` filter matches subtrees, so every level
 * narrows correctly.
 */
export function ProductListingFilter() {
  const listing = useProductListing();
  return (
    <>
      <Area id="beforeProductListingFilter" noOuter />
      <ProductFilter
        currentFilters={listing.products.currentFilters}
        availableAttributes={listing.availableAttributes}
        categories={listing.categories}
        priceRange={listing.priceRange}
      >
        {(renderProps) => (
          <DefaultProductFilterRender
            renderProps={renderProps}
            title={_('Filters')}
            showFilterSummary={true}
          />
        )}
      </ProductFilter>
      <Area id="afterProductListingFilter" noOuter />
    </>
  );
}
