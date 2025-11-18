import Area from '@components/common/Area.js';
import { DefaultAttributeFilterRender } from '@components/frontStore/catalog/DefaultAttributeFilterRender.js';
import { DefaultCategoryFilterRender } from '@components/frontStore/catalog/DefaultCategoryFilterRender.js';
import { DefaultPriceFilterRender as PriceFilterRenderer } from '@components/frontStore/catalog/DefaultPriceFilterRender.js';
import { DefaultProductFilterSummary } from '@components/frontStore/catalog/DefaultProductFilterSummary.js';
import {
  ProductFilterRenderProps,
  FilterComponent,
  ProductFilterDispatch
} from '@components/frontStore/catalog/ProductFilter.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { useState, useMemo } from 'react';
import React from 'react';

export const DefaultProductFilterRender: React.FC<{
  renderProps: ProductFilterRenderProps;
  className?: string;
  title?: string;
  showFilterSummary?: boolean;
}> = ({
  renderProps,
  className = '',
  title = _('Filter Products'),
  showFilterSummary = true
}) => {
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const {
    currentFilters,
    availableAttributes,
    priceRange,
    categories,
    setting,
    removeFilter,
    updateFilter,
    clearAllFilters,
    isLoading,
    activeFilterCount
  } = renderProps;

  const defaultComponents = useMemo(() => {
    const components: FilterComponent[] = [];

    if (priceRange && priceRange.min !== priceRange.max) {
      components.push({
        component: { default: PriceFilterRenderer },
        props: { priceRange, currentFilters, setting },
        sortOrder: 10,
        id: 'price-filter'
      });
    }

    if (categories.length > 0) {
      components.push({
        component: { default: DefaultCategoryFilterRender },
        props: { categories, currentFilters },
        sortOrder: 15,
        id: 'category-filter'
      });
    }

    if (availableAttributes.length > 0) {
      components.push({
        component: { default: DefaultAttributeFilterRender },
        props: { availableAttributes, currentFilters },
        sortOrder: 20,
        id: 'attribute-filter'
      });
    }

    return components;
  }, [availableAttributes, priceRange, categories, currentFilters, setting]);

  const contextValue = useMemo(
    () => ({ updateFilter, removeFilter, clearAllFilters }),
    [updateFilter, removeFilter, clearAllFilters]
  );

  return (
    <ProductFilterDispatch.Provider value={contextValue}>
      <button
        onClick={() => setIsMobileFilterOpen(true)}
        className="md:hidden w-full flex items-center justify-center space-x-2 py-3 px-4 border border-gray-300 rounded-md bg-white hover:bg-gray-50 transition-colors"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707v4.586a1 1 0 01-.293.707l-2 2A1 1 0 0111 21v-6.586a1 1 0 00-.293-.707L4.293 7.293A1 1 0 014 6.586V4z"
          />
        </svg>
        <span>{_('Filters')}</span>
        {activeFilterCount > 0 && (
          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
            {activeFilterCount}
          </span>
        )}
      </button>

      {isMobileFilterOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end">
          <div className="w-full bg-white rounded-t-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-lg">{_('Filters')}</h3>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {showFilterSummary && (
                <DefaultProductFilterSummary
                  availableAttributes={availableAttributes}
                  currentFilters={currentFilters}
                  priceRange={priceRange}
                  categories={categories}
                />
              )}

              <div
                className={isLoading ? 'opacity-75 pointer-events-none' : ''}
              >
                <Area
                  id="productFilter"
                  noOuter
                  coreComponents={defaultComponents}
                  availableAttributes={availableAttributes}
                  priceRange={priceRange}
                  currentFilters={currentFilters}
                  categories={categories}
                  setting={setting}
                />
              </div>
            </div>

            <div className="p-4 border-t flex space-x-3">
              <button
                onClick={clearAllFilters}
                disabled={isLoading || activeFilterCount === 0}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {_('Clear All')}
              </button>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {_('Apply Filters')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`hidden md:block product-filter ${className}`}>
        <div className="filter-header flex items-center justify-between mb-4">
          {title && (
            <h3 className="font-bold text-lg flex items-center">
              {title}
              {activeFilterCount > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
                  {activeFilterCount}
                </span>
              )}
              {isLoading && (
                <div className="ml-2 w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              )}
            </h3>
          )}

          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              disabled={isLoading}
              className="text-sm text-gray-600 hover:text-red-600 transition-colors disabled:opacity-50"
            >
              {_('Clear All')}
            </button>
          )}
        </div>

        {showFilterSummary && (
          <DefaultProductFilterSummary
            availableAttributes={availableAttributes}
            currentFilters={currentFilters}
            priceRange={priceRange}
            categories={categories}
          />
        )}

        <div className={isLoading ? 'opacity-75 pointer-events-none' : ''}>
          <Area
            id="productFilter"
            noOuter
            coreComponents={defaultComponents}
            availableAttributes={availableAttributes}
            priceRange={priceRange}
            currentFilters={currentFilters}
            categories={categories}
            setting={setting}
          />
        </div>
      </div>
    </ProductFilterDispatch.Provider>
  );
};
