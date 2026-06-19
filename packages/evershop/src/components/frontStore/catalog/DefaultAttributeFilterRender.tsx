import { Button } from '@components/common/ui/Button.js';
import { Checkbox } from '@components/common/ui/Checkbox.js';
import { Label } from '@components/common/ui/Label.js';
import {
  FilterableAttribute,
  FilterInput,
  useProductFilter
} from '@components/frontStore/catalog/ProductFilter.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React, { useState } from 'react';

export const DefaultAttributeFilterRender: React.FC<{
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
            className="attribute__filter__section border-b border-border pb-2 mb-2"
          >
            <div className="filter__header flex items-center justify-between mb-3">
              <button
                onClick={() => toggleCollapse(attribute.attributeCode)}
                className="flex items-center justify-between text-left flex-1 hover:text-primary transition-colors"
              >
                <span className="font-medium">{attribute.attributeName}</span>
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
                <Button
                  variant={'link'}
                  onClick={() => clearAttributeFilter(attribute.attributeCode)}
                  className="hover:text-destructive text-sm transition-colors"
                  title={_('Clear all')}
                >
                  ✕
                </Button>
              )}
            </div>

            {!isCollapsed && (
              <div className="filter__content">
                {attribute.options.length > 5 && (
                  <div className="mb-3">
                    <Checkbox
                      value={searchTerms[attribute.attributeCode] || ''}
                      onCheckedChange={(checked) =>
                        setSearchTerms((prev) => ({
                          ...prev,
                          [attribute.attributeCode]: checked
                            ? checked.toString()
                            : ''
                        }))
                      }
                    />
                  </div>
                )}

                <div className="attribute__options space-y-2 max-h-48 overflow-y-auto">
                  {filteredOptions.length > 0 ? (
                    filteredOptions.map((option) => {
                      const isSelected = isOptionSelected(
                        attribute.attributeCode,
                        option.optionId.toString()
                      );
                      return (
                        <div
                          key={option.optionId}
                          className={`flex items-center space-x-2 cursor-pointer py-2`}
                        >
                          <Checkbox
                            checked={isSelected}
                            id={`${attribute.attributeCode}-${option.optionId}`}
                            onCheckedChange={(checked) =>
                              handleAttributeChange(
                                attribute.attributeCode,
                                option.optionId.toString(),
                                checked
                              )
                            }
                          />
                          <Label
                            htmlFor={`${attribute.attributeCode}-${option.optionId}`}
                          >
                            {option.optionText}
                          </Label>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-muted-foreground text-sm text-center py-4">
                      {_('No options found for "${code}"', {
                        code: searchTerms[attribute.attributeCode]
                      })}
                    </div>
                  )}
                </div>

                {!searchTerms[attribute.attributeCode] &&
                  attribute.options.length > 10 && (
                    <Button
                      variant={'link'}
                      className="text-primary text-sm mt-2 hover:underline"
                    >
                      {_('Show all ${count} options', {
                        count: attribute.options.length.toString()
                      })}
                    </Button>
                  )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};
