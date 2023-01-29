import React from 'react';
import PropTypes from 'prop-types';
import Area from '../../../../../lib/components/Area';
import { useAppDispatch } from '../../../../../lib/context/app';
import './Filter.scss';

export const FilterDispatch = React.createContext();

export default function Filter({
  category: {
    products: {
      currentFilters
    },
    availableAttributes,
    priceRange
  }
}) {
  const AppContextDispatch = useAppDispatch();

  const updateFilter = async (newFilters) => {
    const currentUrl = window.location.href;
    const url = new URL(currentUrl, window.location.origin);
    for (let i = 0; i < currentFilters.length; i += 1) {
      url.searchParams.delete(currentFilters[i].key);
    }

    for (let i = 0; i < newFilters.length; i += 1) {
      url.searchParams.append(newFilters[i].key, newFilters[i].value);
    }
    // window.location.href = url;
    url.searchParams.delete('ajax', true);

    // Delete the page. We want to go back to page 1
    url.searchParams.delete('page');
    url.searchParams.append('ajax', true);
    await AppContextDispatch.fetchPageData(url);
    url.searchParams.delete('ajax');
    history.pushState(null, '', url);
  };

  return <FilterDispatch.Provider value={{ updateFilter }}>
    <div className="product-filter-tool">
      <div className="filter-heading">
        <span className="font-bold ">SHOP BY</span>
      </div>
      <Area
        id="productFilter"
        noOuter={true}
        availableAttributes={availableAttributes}
        priceRange={priceRange}
        currentFilters={currentFilters}
      />
    </div>
  </FilterDispatch.Provider>
}

Filter.propTypes = {
  category: PropTypes.shape({
    products: PropTypes.shape({
      currentFilters: PropTypes.arrayOf(PropTypes.shape({
        key: PropTypes.string,
        operation: PropTypes.string,
        value: PropTypes.string
      }))
    }),
    availableAttributes: PropTypes.arrayOf(PropTypes.shape({
      attributeCode: PropTypes.string,
      attributeName: PropTypes.string,
      options: PropTypes.arrayOf(PropTypes.shape({
        optionId: PropTypes.number,
        optionText: PropTypes.string
      }))
    })),
    priceRange: PropTypes.shape({
      min: PropTypes.number,
      max: PropTypes.number
    })
  })
}

export const layout = {
  areaId: 'leftColumn',
  sortOrder: 1
};

export const query = `
query Query {
  category (id: getContextValue('categoryId')) {
    products (filters: getContextValue('filtersFromUrl')) {
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
  }
}`;

export const useFilterDispatch = () => React.useContext(FilterDispatch);
