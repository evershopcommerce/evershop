import {
  CategoryFilter,
  FilterableAttribute,
  FilterInput,
  PriceRange
} from '@components/frontStore/catalog/ProductFilter.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export const formatPrice = (oldFormatted: string, price: number) => {
  const match = oldFormatted.match(/^[^\d.,]+/);
  const currencySymbol = match ? match[0] : '';
  return currencySymbol + price;
};

export const getFilterSummary = (
  availableAttributes,
  currentFilters,
  priceRange,
  categories
) => {
  const summaries: string[] = [];

  // Price filters
  const minPrice = currentFilters.find((f) => f.key === 'min_price');
  const maxPrice = currentFilters.find((f) => f.key === 'max_price');
  if (minPrice || maxPrice) {
    const min = minPrice?.value || priceRange?.min.toString() || '0';
    const max = maxPrice?.value || priceRange?.max.toString() || '∞';
    summaries.push(
      _('Price: ${value}', {
        value: `${formatPrice(
          priceRange.minText,
          parseInt(min)
        )} - ${formatPrice(priceRange.maxText, parseInt(max))}`
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

export const DefaultProductFilterSummary: React.FC<{
  availableAttributes: FilterableAttribute[];
  currentFilters: FilterInput[];
  priceRange?: PriceRange;
  categories: CategoryFilter[];
}> = ({ availableAttributes, currentFilters, priceRange, categories }) => {
  const filterSummary = getFilterSummary(
    availableAttributes,
    currentFilters,
    priceRange,
    categories
  );

  if (filterSummary.length === 0) {
    return null;
  }
  return (
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
  );
};
