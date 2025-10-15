import { useAppDispatch } from '@components/common/context/app.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React, { useState, useContext, useCallback } from 'react';

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
  minText: string;
  max: number;
  maxText: string;
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
  isLoading: boolean;
  activeFilterCount: number;

  isOptionSelected: (attributeCode: string, optionId: string) => boolean;
  isCategorySelected: (categoryId: string) => boolean;
  getSelectedCount: (attributeCode: string) => number;
  getCategorySelectedCount: () => number;
}

export interface ProductFilterProps {
  currentFilters: FilterInput[];
  availableAttributes?: FilterableAttribute[];
  priceRange: PriceRange;
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
    setIsLoading(true);
    const url = new URL(window.location.href, window.location.origin);
    for (const key of [...url.searchParams.keys()]) {
      if (!['page', 'limit', 'ob', 'od'].includes(key)) {
        url.searchParams.delete(key);
      }
    }
    url.searchParams.append('ajax', 'true');
    AppContextDispatch.fetchPageData(url)
      .then(() => {
        url.searchParams.delete('ajax');
        history.pushState(null, '', url);
      })
      .finally(() => setIsLoading(false));
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

    isLoading,
    activeFilterCount,

    isOptionSelected,
    isCategorySelected,
    getSelectedCount,
    getCategorySelectedCount
  };

  return children(renderProps);
};
