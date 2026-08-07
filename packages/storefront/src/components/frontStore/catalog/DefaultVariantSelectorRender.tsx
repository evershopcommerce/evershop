import React from 'react';
import './VariantSelector.scss';
import {
  VariantAttributeGroupProps,
  VariantOptionItemProps
} from '@components/frontStore/catalog/VariantSelector.js';

const DefaultVariantOptionItem: React.FC<VariantOptionItemProps> = ({
  option,
  attribute,
  isSelected,
  onSelect
}) => {
  let className = '';
  if (isSelected) {
    className = 'selected';
  }
  if (option.available === false) {
    className = 'un-available';
  }

  return (
    <li key={option.optionId} className={className}>
      <a
        href="#"
        onClick={async (e) => {
          e.preventDefault();
          if (option.available === false) {
            return;
          }
          await onSelect(attribute.attributeCode, option.optionId);
        }}
      >
        {option.optionText}
      </a>
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
