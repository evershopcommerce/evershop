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
  let className = 'group ';
  if (isSelected) {
    className += 'selected';
  }
  if (option.available === false) {
    className += 'un-available';
  }

  return (
    <li key={option.optionId} className={className}>
      <Button
        variant={isSelected ? 'default' : 'outline'}
        onClick={async (e) => {
          e.preventDefault();
          if (option.available === false) {
            return;
          }
          await onSelect(attribute.attributeCode, option.optionId);
        }}
        className={'group-[.selected]:border-primary'}
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
      <div className="mb-2 text-textSubdued uppercase">
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
