import React, { useMemo, useState, useContext, useCallback } from 'react';
import RangeSlider from 'react-range-slider-input';
import { _ } from '../../lib/locale/translate/_.js';
import Area from '@components/common/Area.js';
import { useAppDispatch } from '@components/common/context/app.js';
import 'react-range-slider-input/dist/style.css';

export interface FilterInput {
  key: string;
  operation: 'eq' | 'in' | 'range' | 'gt' | 'lt';
  value: string;
}

export interface FilterableAttribute {
  attributeCode: string;
  attributeName: string;
  attributeId: number;
  options: Array<{
    optionId: number;
    optionText: string;
  }>;
}

export interface PriceRange {
  min: number;
  max: number;
}

export interface CategoryFilter {
  categoryId: number;
  name: string;
  uuid: string;
}

export interface FilterComponent {
  component: { default: React.ComponentType<any> };
  props: Record<string, any>;
  sortOrder: number;
  id?: string;
}

export interface ProductFilterRenderProps {
  currentFilters: FilterInput[];
  availableAttributes: FilterableAttribute[];
  priceRange?: PriceRange;
  categories: CategoryFilter[];
  setting?: {
    storeLanguage: string;
    storeCurrency: string;
  };

  updateFilter: (filters: FilterInput[]) => void;
  clearAllFilters: () => void;
  addFilter: (
    key: string,
    operation: FilterInput['operation'],
    value: string
  ) => void;
  removeFilter: (key: string) => void;
  removeFilterValue: (key: string, value: string) => void;
  toggleFilter: (
    key: string,
    operation: FilterInput['operation'],
    value: string
  ) => void;

  hasFilter: (key: string) => boolean;
  getFilterValue: (key: string) => string | undefined;
  formatPrice: (price: number) => string;

  isLoading: boolean;
  activeFilterCount: number;
  filterSummary: string[];

  isOptionSelected: (attributeCode: string, optionId: string) => boolean;
  isCategorySelected: (categoryId: string) => boolean;
  getSelectedCount: (attributeCode: string) => number;
  getCategorySelectedCount: () => number;
}

export interface ProductFilterProps {
  currentFilters: FilterInput[];
  availableAttributes?: FilterableAttribute[];
  priceRange?: PriceRange;
  categories?: CategoryFilter[];
  setting?: {
    storeLanguage: string;
    storeCurrency: string;
  };
  onFilterUpdate?: (filters: FilterInput[]) => void;
  children: (props: ProductFilterRenderProps) => React.ReactNode;
}

// Create a context for filter dispatch
export const ProductFilterDispatch = React.createContext<{
  updateFilter: (filters: FilterInput[]) => void;
} | null>(null);

// Hook to use the filter context
export const useProductFilter = () => {
  const context = useContext(ProductFilterDispatch);
  if (!context) {
    throw new Error(
      'useProductFilter must be used within a ProductFilterProvider'
    );
  }
  return context;
};

export const useFilters = (initialFilters: FilterInput[] = []) => {
  const [filters, setFilters] = useState<FilterInput[]>(initialFilters);

  const addFilter = useCallback(
    (key: string, operation: FilterInput['operation'], value: string) => {
      setFilters((prev) => {
        if (operation === 'in') {
          const existingFilter = prev.find(
            (f) => f.key === key && f.operation === 'in'
          );
          if (existingFilter) {
            const existingValues = existingFilter.value.split(',');
            if (!existingValues.includes(value)) {
              const newValues = [...existingValues, value].join(',');
              return prev.map((f) =>
                f.key === key && f.operation === 'in'
                  ? { ...f, value: newValues }
                  : f
              );
            }
            return prev;
          } else {
            const filtered = prev.filter((f) => f.key !== key);
            return [...filtered, { key, operation, value }];
          }
        } else {
          const filtered = prev.filter((f) => f.key !== key);
          return [...filtered, { key, operation, value }];
        }
      });
    },
    []
  );

  const removeFilter = useCallback((key: string) => {
    setFilters((prev) => prev.filter((f) => f.key !== key));
  }, []);

  const removeFilterValue = useCallback((key: string, value: string) => {
    setFilters((prev) => {
      const filter = prev.find((f) => f.key === key && f.operation === 'in');
      if (filter) {
        const values = filter.value.split(',');
        const newValues = values.filter((v) => v !== value);

        if (newValues.length === 0) {
          return prev.filter((f) => !(f.key === key && f.operation === 'in'));
        } else if (newValues.length === 1) {
          return prev.map((f) =>
            f.key === key && f.operation === 'in'
              ? { key, operation: 'eq' as const, value: newValues[0] }
              : f
          );
        } else {
          return prev.map((f) =>
            f.key === key && f.operation === 'in'
              ? { ...f, value: newValues.join(',') }
              : f
          );
        }
      } else {
        return prev.filter((f) => f.key !== key);
      }
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters([]);
  }, []);

  const hasFilter = useCallback(
    (key: string) => {
      return filters.some((f) => f.key === key);
    },
    [filters]
  );

  const getFilterValue = useCallback(
    (key: string) => {
      return filters.find((f) => f.key === key)?.value;
    },
    [filters]
  );

  const toggleFilter = useCallback(
    (key: string, operation: FilterInput['operation'], value: string) => {
      if (hasFilter(key)) {
        removeFilter(key);
      } else {
        addFilter(key, operation, value);
      }
    },
    [hasFilter, removeFilter, addFilter]
  );

  return {
    filters,
    setFilters,
    addFilter,
    removeFilter,
    removeFilterValue,
    clearAllFilters,
    hasFilter,
    getFilterValue,
    toggleFilter,
    activeCount: filters.length
  };
};

export const DefaultFilterRenderer: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <div className="filter-section">
    <div className="filter-title font-medium mb-3">{title}</div>
    <div className="filter-content">{children}</div>
  </div>
);

export const PriceFilterRenderer: React.FC<{
  priceRange: PriceRange;
  currentFilters: FilterInput[];
  setting?: ProductFilterProps['setting'];
}> = ({ priceRange, currentFilters, setting }) => {
  const { updateFilter } = useProductFilter();

  // Initialize from current filters
  const [localMin, setLocalMin] = useState(() => {
    const minFilter = currentFilters.find((f) => f.key === 'min_price');
    return minFilter ? parseInt(minFilter.value) : priceRange.min;
  });

  const [localMax, setLocalMax] = useState(() => {
    const maxFilter = currentFilters.find((f) => f.key === 'max_price');
    return maxFilter ? parseInt(maxFilter.value) : priceRange.max;
  });

  const debouncedUpdate = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (min: number, max: number) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const newFilters = currentFilters.filter(
          (f) => f.key !== 'min_price' && f.key !== 'max_price'
        );

        if (min > priceRange.min) {
          newFilters.push({
            key: 'min_price',
            operation: 'eq',
            value: min.toString()
          });
        }
        if (max < priceRange.max) {
          newFilters.push({
            key: 'max_price',
            operation: 'eq',
            value: max.toString()
          });
        }

        updateFilter(newFilters);
      }, 300); // 300ms debounce
    };
  }, [currentFilters, priceRange, updateFilter]);

  // Sync with external filter changes
  React.useEffect(() => {
    const minFilter = currentFilters.find((f) => f.key === 'min_price');
    const maxFilter = currentFilters.find((f) => f.key === 'max_price');

    setLocalMin(minFilter ? parseInt(minFilter.value) : priceRange.min);
    setLocalMax(maxFilter ? parseInt(maxFilter.value) : priceRange.max);
  }, [currentFilters, priceRange]);

  const handleRangeChange = (values: [number, number]) => {
    const [min, max] = values;
    setLocalMin(min);
    setLocalMax(max);
    debouncedUpdate(min, max);
  };

  const formatPrice = (price: number) => {
    if (!setting) return `$${price}`;
    return new Intl.NumberFormat(setting.storeLanguage, {
      style: 'currency',
      currency: setting.storeCurrency
    }).format(price);
  };

  return (
    <DefaultFilterRenderer title={_('Price')}>
      <div className="price-filter border-b border-gray-200 pb-2 mb-2">
        <div className="price-slider mb-4">
          <RangeSlider.default
            min={priceRange.min}
            max={priceRange.max}
            value={[localMin, localMax]}
            onInput={handleRangeChange}
          />
        </div>

        <div className="flex justify-between text-small text-gray-500 mt-2">
          <span>{formatPrice(priceRange.min)}</span>
          <span>{formatPrice(priceRange.max)}</span>
        </div>
      </div>
      <style>{`.range-slider .range-slider__thumb { width: 1rem; height: 1rem} .range-slider {height:6px}`}</style>
    </DefaultFilterRenderer>
  );
};

export const AttributeFilterRenderer: React.FC<{
  availableAttributes: FilterableAttribute[];
  currentFilters: FilterInput[];
}> = ({ availableAttributes, currentFilters }) => {
  const { updateFilter } = useProductFilter();
  const [searchTerms, setSearchTerms] = useState<{ [key: string]: string }>({});
  const [collapsedAttributes, setCollapsedAttributes] = useState<{
    [key: string]: boolean;
  }>({});

  const handleAttributeChange = (
    attributeCode: string,
    optionId: string,
    checked: boolean
  ) => {
    let newFilters = [...currentFilters];
    const existingFilterIndex = newFilters.findIndex(
      (f) => f.key === attributeCode
    );

    if (checked) {
      if (existingFilterIndex !== -1) {
        const existingFilter = newFilters[existingFilterIndex];
        const values = existingFilter.value.split(',');
        if (!values.includes(optionId)) {
          values.push(optionId);
          newFilters[existingFilterIndex] = {
            ...existingFilter,
            value: values.join(',')
          };
        }
      } else {
        newFilters.push({
          key: attributeCode,
          operation: 'in',
          value: optionId
        });
      }
    } else if (existingFilterIndex !== -1) {
      const existingFilter = newFilters[existingFilterIndex];
      const values = existingFilter.value
        .split(',')
        .filter((v) => v !== optionId);
      if (values.length === 0) {
        newFilters = newFilters.filter((f) => f.key !== attributeCode);
      } else {
        newFilters[existingFilterIndex] = {
          ...existingFilter,
          value: values.join(',')
        };
      }
    }

    updateFilter(newFilters);
  };

  const isOptionSelected = (attributeCode: string, optionId: string) => {
    const filter = currentFilters.find((f) => f.key === attributeCode);
    return filter
      ? filter.value.split(',').includes(optionId.toString())
      : false;
  };

  const getSelectedCount = (attributeCode: string) => {
    const filter = currentFilters.find((f) => f.key === attributeCode);
    return filter ? filter.value.split(',').length : 0;
  };

  const getFilteredOptions = (attribute: FilterableAttribute) => {
    const searchTerm = searchTerms[attribute.attributeCode] || '';
    if (!searchTerm) return attribute.options;

    return attribute.options.filter((option) =>
      option.optionText.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const toggleCollapse = (attributeCode: string) => {
    setCollapsedAttributes((prev) => ({
      ...prev,
      [attributeCode]: !prev[attributeCode]
    }));
  };

  const clearAttributeFilter = (attributeCode: string) => {
    const newFilters = currentFilters.filter((f) => f.key !== attributeCode);
    updateFilter(newFilters);
  };

  return (
    <>
      {availableAttributes.map((attribute) => {
        const selectedCount = getSelectedCount(attribute.attributeCode);
        const filteredOptions = getFilteredOptions(attribute);
        const isCollapsed = collapsedAttributes[attribute.attributeCode];

        return (
          <div
            key={attribute.attributeCode}
            className="attribute-filter-section border-b border-gray-200 pb-2 mb-2"
          >
            {/* Header with title, count, and collapse toggle */}
            <div className="filter-header flex items-center justify-between mb-3">
              <button
                onClick={() => toggleCollapse(attribute.attributeCode)}
                className="flex items-center space-x-2 text-left flex-1 hover:text-blue-600 transition-colors"
              >
                <span className="font-medium">{attribute.attributeName}</span>
                {selectedCount > 0 && (
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {selectedCount}
                  </span>
                )}
                <svg
                  className={`w-4 h-4 transition-transform ${
                    isCollapsed ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {selectedCount > 0 && (
                <button
                  onClick={() => clearAttributeFilter(attribute.attributeCode)}
                  className="text-gray-400 hover:text-red-500 text-sm transition-colors"
                  title="Clear all"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Collapsible content */}
            {!isCollapsed && (
              <div className="filter-content">
                {/* Search input for attributes with many options */}
                {attribute.options.length > 5 && (
                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder={`Search ${attribute.attributeName.toLowerCase()}...`}
                      value={searchTerms[attribute.attributeCode] || ''}
                      onChange={(e) =>
                        setSearchTerms((prev) => ({
                          ...prev,
                          [attribute.attributeCode]: e.target.value
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {/* Options list */}
                <div className="attribute-options space-y-2 max-h-48 overflow-y-auto">
                  {filteredOptions.length > 0 ? (
                    filteredOptions.map((option) => {
                      const isSelected = isOptionSelected(
                        attribute.attributeCode,
                        option.optionId.toString()
                      );
                      return (
                        <label
                          key={option.optionId}
                          className={`flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-gray-50 transition-colors ${
                            isSelected
                              ? 'bg-blue-50 border border-blue-200'
                              : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) =>
                              handleAttributeChange(
                                attribute.attributeCode,
                                option.optionId.toString(),
                                e.target.checked
                              )
                            }
                            className="form-checkbox h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span
                            className={`text-sm ${
                              isSelected
                                ? 'font-medium text-blue-900'
                                : 'text-gray-700'
                            }`}
                          >
                            {option.optionText}
                          </span>
                        </label>
                      );
                    })
                  ) : (
                    <div className="text-gray-500 text-sm text-center py-4">
                      {_('No options found for "${code}"', {
                        code: searchTerms[attribute.attributeCode]
                      })}
                    </div>
                  )}
                </div>

                {/* Show more button for long lists */}
                {!searchTerms[attribute.attributeCode] &&
                  attribute.options.length > 10 && (
                    <button className="text-blue-600 text-sm mt-2 hover:underline">
                      {_('Show all ${count} options', {
                        count: attribute.options.length.toString()
                      })}
                    </button>
                  )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};

export const CategoryFilterRenderer: React.FC<{
  categories: CategoryFilter[];
  currentFilters: FilterInput[];
}> = ({ categories, currentFilters }) => {
  const { updateFilter } = useProductFilter();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    let newFilters = [...currentFilters];
    const existingFilter = newFilters.find((f) => f.key === 'cat');

    if (checked) {
      if (existingFilter) {
        const values = existingFilter.value.split(',');
        if (!values.includes(categoryId)) {
          values.push(categoryId);
          existingFilter.value = values.join(',');
        }
      } else {
        newFilters.push({
          key: 'cat',
          operation: 'in',
          value: categoryId
        });
      }
    } else if (existingFilter) {
      const values = existingFilter.value
        .split(',')
        .filter((v) => v !== categoryId);
      if (values.length === 0) {
        newFilters = newFilters.filter((f) => f.key !== 'cat');
      } else {
        existingFilter.value = values.join(',');
      }
    }

    updateFilter(newFilters);
  };

  const isCategorySelected = (categoryId: string) => {
    const filter = currentFilters.find((f) => f.key === 'cat');
    return filter ? filter.value.split(',').includes(categoryId) : false;
  };

  const getSelectedCount = () => {
    const filter = currentFilters.find((f) => f.key === 'cat');
    return filter ? filter.value.split(',').length : 0;
  };

  const clearCategoryFilter = () => {
    const newFilters = currentFilters.filter((f) => f.key !== 'cat');
    updateFilter(newFilters);
  };

  const getFilteredCategories = () => {
    if (!searchTerm) return categories;
    return categories.filter((category) =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  if (!categories || categories.length === 0) {
    return null;
  }

  const selectedCount = getSelectedCount();
  const filteredCategories = getFilteredCategories();

  return (
    <div className="category-filter-section border-b border-gray-200 pb-2 mb-2">
      <div className="filter-header flex items-center justify-between mb-3">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center space-x-2 text-left flex-1 hover:text-blue-600 transition-colors"
        >
          <span className="font-medium">Categories</span>
          {selectedCount > 0 && (
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              {selectedCount}
            </span>
          )}
          <svg
            className={`w-4 h-4 transition-transform ${
              isCollapsed ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {selectedCount > 0 && (
          <button
            onClick={clearCategoryFilter}
            className="text-gray-400 hover:text-red-500 text-sm transition-colors"
            title="Clear categories"
          >
            ✕
          </button>
        )}
      </div>

      {!isCollapsed && (
        <div className="filter-content">
          {categories.length > 5 && (
            <div className="mb-3">
              <input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="category-options space-y-2 max-h-48 overflow-y-auto">
            {filteredCategories.length > 0 ? (
              filteredCategories.map((category) => {
                const isSelected = isCategorySelected(
                  category.categoryId.toString()
                );
                return (
                  <label
                    key={category.categoryId}
                    className={`flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-blue-50 border border-blue-200' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) =>
                        handleCategoryChange(
                          category.categoryId.toString(),
                          e.target.checked
                        )
                      }
                      className="form-checkbox h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span
                      className={`text-sm ${
                        isSelected
                          ? 'font-medium text-blue-900'
                          : 'text-gray-700'
                      }`}
                    >
                      {category.name}
                    </span>
                  </label>
                );
              })
            ) : (
              <div className="text-gray-500 text-sm text-center py-4">
                {_('No categories found for "${term}"', { term: searchTerm })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const ProductFilter: React.FC<ProductFilterProps> = ({
  currentFilters,
  availableAttributes = [],
  priceRange,
  categories = [],
  setting,
  onFilterUpdate,
  children
}) => {
  const AppContextDispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);

  const defaultUpdateFilter = async (newFilters: FilterInput[]) => {
    setIsLoading(true);
    try {
      const currentUrl = window.location.href;
      const url = new URL(currentUrl, window.location.origin);

      for (const filter of currentFilters) {
        if (['page', 'limit', 'ob', 'od'].includes(filter.key)) {
          continue;
        }

        if (filter.operation === 'eq') {
          url.searchParams.delete(filter.key);
        } else {
          url.searchParams.delete(`${filter.key}[operation]`);
          url.searchParams.delete(`${filter.key}[value]`);
        }
      }

      // Add new filter parameters
      for (const filter of newFilters) {
        if (['page', 'limit', 'ob', 'od'].includes(filter.key)) {
          continue;
        }

        if (filter.operation === 'eq') {
          url.searchParams.append(filter.key, filter.value);
        } else {
          url.searchParams.append(`${filter.key}[operation]`, filter.operation);
          url.searchParams.append(`${filter.key}[value]`, filter.value);
        }
      }

      url.searchParams.delete('page');
      url.searchParams.append('ajax', 'true');

      // Update page data via GraphQL
      await AppContextDispatch.fetchPageData(url);
      url.searchParams.delete('ajax');

      history.pushState(null, '', url);
    } catch (error) {
      //eslint-disable-next-line no-console
      console.error('Failed to update filters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFilter = onFilterUpdate || defaultUpdateFilter;

  // Filter management functions
  const addFilter = useCallback(
    (key: string, operation: FilterInput['operation'], value: string) => {
      let newFilters: FilterInput[];

      // For 'in' operation, handle multiple values
      if (operation === 'in') {
        const existingFilter = currentFilters.find(
          (f) => f.key === key && f.operation === 'in'
        );
        if (existingFilter) {
          // Add value to existing 'in' filter if not already present
          const existingValues = existingFilter.value.split(',');
          if (!existingValues.includes(value)) {
            const newValues = [...existingValues, value].join(',');
            newFilters = currentFilters.map((f) =>
              f.key === key && f.operation === 'in'
                ? { ...f, value: newValues }
                : f
            );
          } else {
            return;
          }
        } else {
          newFilters = currentFilters.filter((f) => f.key !== key);
          newFilters.push({ key, operation, value });
        }
      } else {
        newFilters = currentFilters.filter((f) => f.key !== key);
        newFilters.push({ key, operation, value });
      }

      updateFilter(newFilters);
    },
    [currentFilters, updateFilter]
  );

  const removeFilter = useCallback(
    (key: string) => {
      const newFilters = currentFilters.filter((f) => f.key !== key);
      updateFilter(newFilters);
    },
    [currentFilters, updateFilter]
  );

  const removeFilterValue = useCallback(
    (key: string, value: string) => {
      const filter = currentFilters.find(
        (f) => f.key === key && f.operation === 'in'
      );
      if (filter) {
        const values = filter.value.split(',');
        const newValues = values.filter((v) => v !== value);

        if (newValues.length === 0) {
          const newFilters = currentFilters.filter(
            (f) => !(f.key === key && f.operation === 'in')
          );
          updateFilter(newFilters);
        } else if (newValues.length === 1) {
          const newFilters = currentFilters.map((f) =>
            f.key === key && f.operation === 'in'
              ? { key, operation: 'eq' as const, value: newValues[0] }
              : f
          );
          updateFilter(newFilters);
        } else {
          const newFilters = currentFilters.map((f) =>
            f.key === key && f.operation === 'in'
              ? { ...f, value: newValues.join(',') }
              : f
          );
          updateFilter(newFilters);
        }
      } else {
        const newFilters = currentFilters.filter((f) => f.key !== key);
        updateFilter(newFilters);
      }
    },
    [currentFilters, updateFilter]
  );

  const toggleFilter = useCallback(
    (key: string, operation: FilterInput['operation'], value: string) => {
      // For 'in' operation, handle multi-value toggle
      if (operation === 'in') {
        const filter = currentFilters.find(
          (f) => f.key === key && f.operation === 'in'
        );
        if (filter) {
          const values = filter.value.split(',');
          if (values.includes(value)) {
            removeFilterValue(key, value);
          } else {
            addFilter(key, operation, value);
          }
        } else {
          addFilter(key, operation, value);
        }
      } else {
        const hasFilter = currentFilters.some((f) => f.key === key);
        if (hasFilter) {
          removeFilter(key);
        } else {
          addFilter(key, operation, value);
        }
      }
    },
    [currentFilters, addFilter, removeFilter, removeFilterValue]
  );

  const clearAllFilters = useCallback(() => {
    const essentialFilters = currentFilters.filter((f) =>
      ['page', 'limit', 'ob', 'od'].includes(f.key)
    );
    updateFilter(essentialFilters);
  }, [currentFilters, updateFilter]);

  const hasFilter = useCallback(
    (key: string) => {
      return currentFilters.some((f) => f.key === key);
    },
    [currentFilters]
  );

  const getFilterValue = useCallback(
    (key: string) => {
      return currentFilters.find((f) => f.key === key)?.value;
    },
    [currentFilters]
  );

  const formatPrice = useCallback(
    (price: number) => {
      if (!setting) return `$${price}`;
      return new Intl.NumberFormat(setting.storeLanguage, {
        style: 'currency',
        currency: setting.storeCurrency
      }).format(price);
    },
    [setting]
  );

  const isOptionSelected = useCallback(
    (attributeCode: string, optionId: string) => {
      const filter = currentFilters.find((f) => f.key === attributeCode);
      return filter
        ? filter.value.split(',').includes(optionId.toString())
        : false;
    },
    [currentFilters]
  );

  const isCategorySelected = useCallback(
    (categoryId: string) => {
      const filter = currentFilters.find((f) => f.key === 'cat');
      return filter ? filter.value.split(',').includes(categoryId) : false;
    },
    [currentFilters]
  );

  const getSelectedCount = useCallback(
    (attributeCode: string) => {
      const filter = currentFilters.find((f) => f.key === attributeCode);
      return filter ? filter.value.split(',').length : 0;
    },
    [currentFilters]
  );

  const getCategorySelectedCount = useCallback(() => {
    const filter = currentFilters.find((f) => f.key === 'cat');
    return filter ? filter.value.split(',').length : 0;
  }, [currentFilters]);

  const activeFilterCount = currentFilters.filter(
    (f) => !['page', 'limit', 'ob', 'od'].includes(f.key)
  ).length;

  const getFilterSummary = () => {
    const summaries: string[] = [];

    // Price filters
    const minPrice = currentFilters.find((f) => f.key === 'min_price');
    const maxPrice = currentFilters.find((f) => f.key === 'max_price');
    if (minPrice || maxPrice) {
      const min = minPrice?.value || priceRange?.min.toString() || '0';
      const max = maxPrice?.value || priceRange?.max.toString() || '∞';
      summaries.push(
        _('Price: ${value}', {
          value: `${formatPrice(parseInt(min))} - ${formatPrice(parseInt(max))}`
        })
      );
    }

    const categoryFilter = currentFilters.find((f) => f.key === 'cat');
    if (categoryFilter) {
      const selectedCategoryIds = categoryFilter.value.split(',');
      const selectedCategories = categories.filter((cat) =>
        selectedCategoryIds.includes(cat.categoryId.toString())
      );
      if (selectedCategories.length > 0) {
        summaries.push(
          `${_('Categories')}: ${selectedCategories
            .map((c) => c.name)
            .join(', ')}`
        );
      }
    }

    availableAttributes.forEach((attr) => {
      const filter = currentFilters.find((f) => f.key === attr.attributeCode);
      if (filter) {
        const selectedOptionIds = filter.value.split(',');
        const selectedOptions = attr.options.filter((opt) =>
          selectedOptionIds.includes(opt.optionId.toString())
        );
        if (selectedOptions.length > 0) {
          summaries.push(
            `${attr.attributeName}: ${selectedOptions
              .map((o) => o.optionText)
              .join(', ')}`
          );
        }
      }
    });

    return summaries;
  };

  const filterSummary = getFilterSummary();

  const renderProps: ProductFilterRenderProps = {
    currentFilters,
    availableAttributes,
    priceRange,
    categories,
    setting,

    updateFilter,
    clearAllFilters,
    addFilter,
    removeFilter,
    removeFilterValue,
    toggleFilter,

    hasFilter,
    getFilterValue,
    formatPrice,

    isLoading,
    activeFilterCount,
    filterSummary,

    isOptionSelected,
    isCategorySelected,
    getSelectedCount,
    getCategorySelectedCount
  };

  return children(renderProps);
};

export const DefaultProductFilterRenderer: React.FC<{
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
    updateFilter,
    clearAllFilters,
    isLoading,
    activeFilterCount,
    filterSummary
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
        component: { default: CategoryFilterRenderer },
        props: { categories, currentFilters },
        sortOrder: 15,
        id: 'category-filter'
      });
    }

    if (availableAttributes.length > 0) {
      components.push({
        component: { default: AttributeFilterRenderer },
        props: { availableAttributes, currentFilters },
        sortOrder: 20,
        id: 'attribute-filter'
      });
    }

    return components;
  }, [availableAttributes, priceRange, categories, currentFilters, setting]);

  const contextValue = useMemo(() => ({ updateFilter }), [updateFilter]);

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
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
            {activeFilterCount}
          </span>
        )}
      </button>

      {isMobileFilterOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end">
          <div className="w-full bg-white rounded-t-lg max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-lg">Filters</h3>
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
              {showFilterSummary && filterSummary.length > 0 && (
                <div className="active-filters mb-4 p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-blue-900 mb-2">
                    {_('Active Filters')}:
                  </div>
                  <div className="space-y-1">
                    {filterSummary.map((summary, index) => (
                      <div key={index} className="text-sm text-blue-800">
                        {summary}
                      </div>
                    ))}
                  </div>
                </div>
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
        {/* Header with title and clear button */}
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

        {showFilterSummary && filterSummary.length > 0 && (
          <div className="active-filters mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm font-medium text-blue-900 mb-2">
              {_('Active Filters')}:
            </div>
            <div className="space-y-1">
              {filterSummary.map((summary, index) => (
                <div key={index} className="text-sm text-blue-800">
                  {summary}
                </div>
              ))}
            </div>
          </div>
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
