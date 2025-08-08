import React from 'react';
import { AttributeGroupConditionValueSelector } from './AttributeGroupConditionValueSelector.js';
import { CategoryConditionValueSelector } from './CategoryConditionValueSelector.js';
import { CollectionConditionValueSelector } from './CollectionConditionValueSelector.js';
import { Operator } from './conditionCriterias.js';
import { PriceConditionValueSelector } from './PriceConditionValueSelector.js';
import { SkuConditionValueSelector } from './SkuConditionValueSelector.js';

export const ValueSelector: React.FC<{
  condition: {
    key: string;
    operator: Operator;
    value: string | number | Array<string> | Array<number>;
  };
  updateCondition: (
    values: string | number | Array<string> | Array<number>
  ) => void;
}> = ({ condition, updateCondition }) => {
  switch (condition.key) {
    case 'category':
      return (
        <CategoryConditionValueSelector
          selectedValues={
            Array.isArray(condition.value) ? condition.value.map(Number) : []
          }
          updateCondition={updateCondition}
          isMulti={
            condition.operator === Operator.IN ||
            condition.operator === Operator.NOT_IN
          }
        />
      );
    case 'collection':
      return (
        <CollectionConditionValueSelector
          selectedValues={
            Array.isArray(condition.value) ? condition.value.map(Number) : []
          }
          updateCondition={updateCondition}
          isMulti={
            condition.operator === Operator.IN ||
            condition.operator === Operator.NOT_IN
          }
        />
      );
    case 'sku':
      return (
        <SkuConditionValueSelector
          selectedValues={
            Array.isArray(condition.value) ? condition.value.map(String) : []
          }
          updateCondition={updateCondition}
          isMulti={
            condition.operator === Operator.IN ||
            condition.operator === Operator.NOT_IN
          }
        />
      );
    case 'attribute_group':
      return (
        <AttributeGroupConditionValueSelector
          selectedValues={
            Array.isArray(condition.value) ? condition.value.map(Number) : []
          }
          updateCondition={updateCondition}
          isMulti={
            condition.operator === Operator.IN ||
            condition.operator === Operator.NOT_IN
          }
        />
      );
    case 'price':
      return (
        <PriceConditionValueSelector
          updateCondition={updateCondition}
          condition={{ ...condition, value: Number(condition.value) }}
        />
      );
    default:
      return null;
  }
};
