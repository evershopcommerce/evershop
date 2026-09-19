import Area from '@components/common/Area.js';
import {
  ProductListingData,
  ProductListingProvider
} from '@components/frontStore/catalog/ProductListingContext.js';
import React from 'react';

interface ProductListingPageProps {
  listing: ProductListingData;
}

/**
 * All-products page shell. Same shape as `CategoryView`: it owns the query, the
 * provider and the slots (Areas); the blocks are sibling page components that
 * register into those slots, so a theme can re-position them from
 * `layouts.json` without overriding this file:
 *
 *   productListing/ProductListingInfo        → productListingPageTop      10
 *   productListing/ProductListingFilter      → productListingLeftColumn   10
 *   productListing/ProductListingSorting     → productListingRightColumn  10
 *   productListing/ProductListingProducts    → productListingRightColumn  20
 *   productListing/ProductListingPagination  → productListingRightColumn  30
 */
export default function ProductListingPage({
  listing
}: ProductListingPageProps) {
  // Every slot is a page-builder drop target. `editableInPageBuilder` is off by
  // default so layout-only Areas can't be edited by accident, but all four of
  // these are places a merchant would reasonably want a widget: a banner above
  // the listing, a promo under the filters, something between the sort bar and
  // the grid. `AreaDropZone` renders null outside the editor iframe, so the
  // production storefront DOM is unchanged.
  //
  // None of them use `noOuter`: the `data-evershop-editable-area` marker is set
  // on the wrapper element, so an Area without one cannot carry it.
  //
  // The heading lives IN `productListingPageTop` rather than in a slot of its
  // own. Within one editable Area the page builder emits a drop zone above
  // everything and after every renderable — layout components included, not
  // just widgets — so a merchant can already place a banner above or below the
  // heading. A second Area would only have added a name indistinguishable from
  // this one. (`CategoryView` does split them, into categoryPageTop +
  // categoryInfo; that predates the drop zones.)
  return (
    <ProductListingProvider listing={listing}>
      <Area
        id="productListingPageTop"
        className="product__listing__page__top"
        editableInPageBuilder
      />
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[240px_1fr]">
        <Area
          id="productListingLeftColumn"
          className="product__listing__left__column"
          editableInPageBuilder
        />
        <Area
          id="productListingRightColumn"
          className="product__listing__right__column min-w-0"
          editableInPageBuilder
        />
      </div>
      <Area
        id="productListingPageBottom"
        className="product__listing__page__bottom"
        editableInPageBuilder
      />
    </ProductListingProvider>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    listing: productListing {
      products {
        items {
          ...Product
        }
        currentFilters {
          key
          operation
          value
        }
        total
      }
      availableAttributes {
        attributeCode
        attributeName
        options {
          optionId
          optionText
        }
      }
      priceRange {
        min
        max
        minText
        maxText
      }
      categories {
        categoryId
        uuid
        name
        depth
      }
    }
}`;

export const fragments = `
  fragment Product on Product {
    productId
    name
    sku
    price {
      regular {
        value
        text
      }
      special {
        value
        text
      }
    }
    inventory {
      isInStock
    }
    image {
      alt
      url
    }
    url
  }
`;
