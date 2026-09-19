import Area from '@components/common/Area.js';
import {
  SearchPageData,
  SearchProvider
} from '@components/frontStore/catalog/SearchContext.js';
import React from 'react';

interface SearchPageProps {
  search: SearchPageData;
}

/**
 * Search page shell. It owns the query, the `SearchProvider` and the slots
 * (Areas); the content is page blocks registering into those slots, so a
 * theme can re-position them from `layouts.json` without overriding this file:
 *
 *   catalogSearch/SearchInfo      → searchPageContent 10  (heading with the result count)
 *   catalogSearch/SearchProducts  → searchPageContent 20  (result grid with its Areas)
 */
export default function SearchPage({ search }: SearchPageProps) {
  return (
    <SearchProvider searchData={search}>
      <Area id="searchPageTop" className="search__page__top" />
      <div className="grid grid-cols-1 ">
        <Area id="searchPageContent" noOuter />
      </div>
      <Area id="searchPageBottom" className="search__page__bottom" />
    </SearchProvider>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    search: productSearch {
      keyword
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
