import { Button } from '@components/common/ui/Button.js';
import {
  VariantAttributeGroupProps,
  VariantOptionItemProps
} from '@components/frontStore/catalog/VariantSelector.js';
import React from 'react';

const DefaultVariantOptionItem: React.FC<VariantOptionItemProps> = ({
  option,
  attribute,
  isSelected,
  onSelect
}) => {
  // An option is unavailable when no real variant exists for it given the
  // other selected attributes. `disabled` drives the Button's built-in
  // disabled treatment (opacity + pointer-events-none); `aria-disabled`
  // announces it to assistive tech. The `un-available` class is kept as a
  // theming hook.
  const isUnavailable = option.available === false;
  let className = 'group ';
  if (isSelected) {
    className += 'selected';
  }
  if (isUnavailable) {
    className += 'un-available';
  }

  return (
    <li key={option.optionId} className={className}>
      <Button
        variant={isSelected ? 'default' : 'outline'}
        disabled={isUnavailable}
        aria-disabled={isUnavailable}
        onClick={async (e) => {
          e.preventDefault();
          if (isUnavailable) {
            return;
          }
          await onSelect(attribute.attributeCode, option.optionId);
        }}
        className={'rounded-full px-4 group-[.selected]:border-primary'}
      >
        {option.optionText}
      </Button>
    </li>
  );
};

const DefaultVariantAttribute: React.FC<VariantAttributeGroupProps> = ({
  attribute,
  options,
  onSelect,
  OptionItem = DefaultVariantOptionItem
}) => {
  return (
    <div key={attribute.attributeCode}>
      <div className="mb-2 text-sm font-medium">
        <span>{attribute.attributeName}</span>
      </div>
      <ul className="variant-option-list flex justify-start gap-2 flex-wrap">
        {options.map((option) => (
          <OptionItem
            key={option.optionId}
            option={option}
            attribute={attribute}
            isSelected={
              attribute.selected && attribute.selectedOption === option.optionId
            }
            onSelect={onSelect}
          />
        ))}
      </ul>
    </div>
  );
};

export { DefaultVariantAttribute, DefaultVariantOptionItem };
