import {
  CategoryFilter,
  FilterInput,
  useProductFilter
} from '@components/frontStore/catalog/ProductFilter.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React, { useState } from 'react';

export const DefaultCategoryFilterRender: React.FC<{
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
    <div className="category__filter__section border-b border-gray-200 pb-2 mb-2">
      <div className="filter__header flex items-center justify-between mb-3">
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
        <div className="filter__content">
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

          <div className="category__options space-y-2 max-h-48 overflow-y-auto">
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
