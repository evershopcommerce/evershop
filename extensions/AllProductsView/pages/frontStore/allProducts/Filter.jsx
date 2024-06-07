import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Area from '@components/common/Area';
import { useAppDispatch } from '@components/common/context/app';
import './Filter.scss';
import { PriceFilter } from '@components/frontStore/catalog/categoryView/filter/PriceFilter';
import { CategoryFilter } from '@components/frontStore/catalog/categoryView/filter/CategoryFilter';
import { _ } from '@evershop/evershop/src/lib/locale/translate';

export const FilterDispatch = React.createContext();

export default function Filter({
  products: { currentFilters },
  categories: { items: cats },
  setting
}) {
  const [isOpen, setIsOpen] = useState(false);
  const AppContextDispatch = useAppDispatch();

  const updateFilter = async (newFilters) => {
    const currentUrl = window.location.href;
    const url = new URL(currentUrl, window.location.origin);
    for (let i = 0; i < currentFilters.length; i += 1) {
      // Leave the page, limit and sort untouched
      if (
        currentFilters[i].key === 'page' ||
        currentFilters[i].key === 'limit' ||
        currentFilters[i].key === 'sortBy' ||
        currentFilters[i].key === 'sortOrder'
      ) {
        continue;
      }
      url.searchParams.delete(currentFilters[i].key);
    }

    for (let i = 0; i < newFilters.length; i += 1) {
      if (
        newFilters[i].key === 'page' ||
        newFilters[i].key === 'limit' ||
        newFilters[i].key === 'sortBy' ||
        newFilters[i].key === 'sortOrder'
      ) {
        continue;
      }
      url.searchParams.append(newFilters[i].key, newFilters[i].value);
    }
    // window.location.href = url;
    url.searchParams.delete('ajax', true);

    // Delete the page. We want to go back to page 1
    url.searchParams.delete('page');
    url.searchParams.append('ajax', true);
    await AppContextDispatch.fetchPageData(url);
    url.searchParams.delete('ajax');
    // eslint-disable-next-line no-restricted-globals
    history.pushState(null, '', url);
  };

  const contextValue = useMemo(() => ({ updateFilter }), [currentFilters]);
  const priceRange = { min: Infinity, max: 0 }
  for (const cat of cats) {
    if (cat.priceRange.min < priceRange.min)
      priceRange.min = cat.priceRange.min
    if (cat.priceRange.max > priceRange.max)
      priceRange.max = cat.priceRange.max
  }
  return (
    <FilterDispatch.Provider value={contextValue}>
      <div
        className={`product-filter-tool hidden md:block ${
          isOpen ? 'opening' : 'closed'
        }`}
      >
        <div className="filter-heading">
          <span className="font-bold ">{_('SHOP BY')}</span>
        </div>
        <Area
          id="productFilter"
          noOuter
          priceRange={priceRange}
          currentFilters={currentFilters}
          coreComponents={[
            {
              component: { default: PriceFilter },
              props: { priceRange, currentFilters, updateFilter, setting },
              sortOrder: 10
            },
            {
              component: { default: CategoryFilter },
              props: {
                currentFilters,
                updateFilter,
                setting,
                categories: cats
              },
              sortOrder: 15
            }
          ]}
        />
        <a
          className="filter-closer flex md:hidden"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setIsOpen(!isOpen);
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
            />
          </svg>
        </a>
      </div>
      <a
        className="filter-opener flex md:hidden"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
          />
        </svg>
      </a>
    </FilterDispatch.Provider>
  );
}

Filter.propTypes = {
  products: PropTypes.shape({
    currentFilters: PropTypes.arrayOf(
      PropTypes.shape({
        key: PropTypes.string,
        operation: PropTypes.string,
        value: PropTypes.string
      })
    )
  }),
  categories: PropTypes.shape({
    items: PropTypes.arrayOf(
      PropTypes.shape({
        categoryId: PropTypes.string,
        name: PropTypes.string,
        uuid: PropTypes.string,
        priceRange: PropTypes.shape({
          min: PropTypes.float,
          max: PropTypes.float
        })
      })
    )
  }).isRequired,
  setting: PropTypes.shape({
    storeLanguage: PropTypes.string,
    storeCurrency: PropTypes.string
  }).isRequired
};

export const layout = {
  areaId: 'leftColumn',
  sortOrder: 1
};

export const query = `
query Query($filters: [FilterInput]) {
  products (filters: $filters) {
    currentFilters {
      key
      operation
      value
    }
  }
  categories {
    items {
      categoryId
      name
      uuid
      priceRange {
        min
        max
      }
    }
  }
  setting {
    storeLanguage
    storeCurrency
  }
}`;

export const useFilterDispatch = () => React.useContext(FilterDispatch);
export const variables = `
{
  filters: getContextValue('filtersFromUrl')
}`;
