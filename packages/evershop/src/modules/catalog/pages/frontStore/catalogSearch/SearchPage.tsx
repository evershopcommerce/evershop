import Area from '@components/common/Area.js';
import {
  SearchPageData,
  SearchProvider
} from '@components/frontStore/catalog/searchContext.js';
import { SearchInfo } from '@components/frontStore/catalog/SearchInfo.js';
import { SearchProducts } from '@components/frontStore/catalog/SearchProducts.js';
import React from 'react';
import { _ } from '../../../../../lib/locale/translate/_.js';

interface SearchPageProps {
  search: SearchPageData;
}

export default function SearchPage({ search }: SearchPageProps) {
  return (
    <SearchProvider searchData={search}>
      <Area id="searchPageTop" className="search__page__top" />
      <div className="page-width grid grid-cols-1 ">
        <SearchInfo />
        <SearchProducts />
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
