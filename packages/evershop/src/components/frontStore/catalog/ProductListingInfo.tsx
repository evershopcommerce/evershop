import Area from '@components/common/Area.js';
import { useProductListing } from '@components/frontStore/catalog/ProductListingContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

/**
 * Heading for the all-products listing. The category page takes its title from
 * the category; this page has no entity, so the title is a fixed string — the
 * same one the route's page meta uses.
 */
export function ProductListingInfo() {
  useProductListing();
  return (
    <>
      <Area id="productListingInfoBefore" noOuter />
      <div className="product__listing__general mb-8">
        <h1 className="text-3xl font-semibold">{_('All products')}</h1>
      </div>
      <Area id="productListingInfoAfter" noOuter />
    </>
  );
}
