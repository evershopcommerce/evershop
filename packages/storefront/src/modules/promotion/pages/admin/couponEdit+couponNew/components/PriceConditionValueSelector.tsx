import { NumberField } from '@components/common/form/NumberField.js';
import React from 'react';
import { Operator } from './conditionCriterias.js';

export const PriceConditionValueSelector = ({
  updateCondition,
  condition
}: {
  updateCondition: (
    values: string | number | Array<string> | Array<number>
  ) => void;
  condition: {
    key: string;
    operator: Operator;
    value: number;
  };
}) => {
  return (
    <div>
      <NumberField
        name={`dummy__` + Math.random().toString(36).substring(2, 15)}
        wrapperClassName="form-field mb-0"
        defaultValue={condition.value}
        placeholder="Value"
        required
        validation={{
          required: 'Value is required'
        }}
        onChange={(value) => {
          updateCondition(value || 0);
        }}
      />
    </div>
  );
};
