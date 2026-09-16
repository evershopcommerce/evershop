import { Checkbox } from '@components/common/ui/Checkbox.js';
import { Input } from '@components/common/ui/Input.js';
import { Label } from '@components/common/ui/Label.js';
import {
  CategoryFilter,
  FilterInput,
  useProductFilter
} from '@components/frontStore/catalog/ProductFilter.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React, { useState } from 'react';

/**
 * Above this many categories the list gets a search box. `/products` offers the
 * whole tree, which can run long; the category page offers one level of
 * children — usually three or four — where a search field would be noise.
 */
const SEARCH_THRESHOLD = 8;

export const DefaultCategoryFilterRender: React.FC<{
  categories: CategoryFilter[];
  currentFilters: FilterInput[];
}> = ({ categories, currentFilters }) => {
  const { updateFilter } = useProductFilter();
  const [searchTerm, setSearchTerm] = useState('');

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    let newFilters = currentFilters.map((f) => ({ ...f }));
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
    <div className="category__filter__section border-b border-border pb-8 mb-8 last:mb-0 last:border-b-0 last:pb-0">
      <div className="filter__header flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{_('Categories')}</h3>

        {selectedCount > 0 && (
          <button
            onClick={clearCategoryFilter}
            className="text-muted-foreground hover:text-destructive text-sm transition-colors"
            title={_('Clear categories')}
          >
            ✕
          </button>
        )}
      </div>

      <div className="filter__content">
        {categories.length > SEARCH_THRESHOLD && (
          <Input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={_('Search categories')}
            aria-label={_('Search categories')}
            className="mb-3 h-8 text-sm"
          />
        )}
        <div className="category__options space-y-2.5 max-h-48 overflow-y-auto">
          {filteredCategories.length > 0 ? (
            filteredCategories.map((category) => {
              const isSelected = isCategorySelected(
                category.categoryId.toString()
              );
              // The `/products` listing offers the whole tree flattened with a
              // depth; the category page offers one level of children and sets
              // none, which falls back to 0 and renders exactly as before.
              // Indentation is the only thing that tells a shopper "Kids" sits
              // under "Accessories" rather than beside it — the `cat` filter
              // matches subtrees, so every level is a valid choice.
              const depth = category.depth ?? 0;
              return (
                <div
                  key={category.categoryId}
                  className="flex items-center gap-2.5 cursor-pointer"
                  style={
                    depth > 0 ? { paddingInlineStart: depth * 14 } : undefined
                  }
                >
                  <Checkbox
                    id={`category-${category.categoryId}`}
                    checked={isSelected}
                    onCheckedChange={(checked) =>
                      handleCategoryChange(
                        category.categoryId.toString(),
                        checked
                      )
                    }
                  />
                  <Label
                    htmlFor={`category-${category.categoryId}`}
                    className="cursor-pointer font-normal leading-5 text-muted-foreground"
                  >
                    {category.name}
                  </Label>
                </div>
              );
            })
          ) : (
            <div className="text-muted-foreground text-sm text-center py-4">
              {_('No categories found for "${term}"', { term: searchTerm })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
