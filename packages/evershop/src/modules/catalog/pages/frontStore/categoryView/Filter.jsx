import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Area from '@components/common/Area';
import { useAppDispatch } from '@components/common/context/app';
import './Filter.scss';
import { PriceFilter } from '@components/frontStore/catalog/categoryView/filter/PriceFilter';
import { AttributeFilter } from '@components/frontStore/catalog/categoryView/filter/AttributeFilter';
import { CategoryFilter } from '@components/frontStore/catalog/categoryView/filter/CategoryFilter';
import { _ } from '@evershop/evershop/src/lib/locale/translate';

export const FilterDispatch = React.createContext();

export default function Filter({
  category: {
    products: { currentFilters },
    availableAttributes,
    priceRange,
    children
  },
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
          availableAttributes={availableAttributes}
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
                categories: children
              },
              sortOrder: 15
            },
            {
              component: { default: AttributeFilter },
              props: { availableAttributes, currentFilters, updateFilter },
              sortOrder: 20
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
  category: PropTypes.shape({
    products: PropTypes.shape({
      currentFilters: PropTypes.arrayOf(
        PropTypes.shape({
          key: PropTypes.string,
          operation: PropTypes.string,
          value: PropTypes.string
        })
      )
    }),
    availableAttributes: PropTypes.arrayOf(
      PropTypes.shape({
        attributeCode: PropTypes.string,
        attributeName: PropTypes.string,
        options: PropTypes.arrayOf(
          PropTypes.shape({
            optionId: PropTypes.number,
            optionText: PropTypes.string
          })
        )
      })
    ),
    priceRange: PropTypes.shape({
      min: PropTypes.number,
      max: PropTypes.number
    }),
    children: PropTypes.arrayOf(
      PropTypes.shape({
        categoryId: PropTypes.number,
        name: PropTypes.string,
        uuid: PropTypes.string
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
  category (id: getContextValue('categoryId')) {
    products (filters: $filters) {
      currentFilters {
        key
        operation
        value
      }
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
    }
    children {
      categoryId,
      name
      uuid
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
