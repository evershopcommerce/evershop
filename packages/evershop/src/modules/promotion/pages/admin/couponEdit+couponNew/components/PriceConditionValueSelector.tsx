import { Field } from '@components/common/form/Field.js';
import React from 'react';

export const PriceConditionValueSelector = ({
  selectedValue,
  updateCondition
}: {
  selectedValue: number;
  updateCondition: (value: number) => void;
}) => {
  const [price, setPrice] = React.useState<number>(selectedValue || 0);

  React.useEffect(() => {
    updateCondition(price);
  }, [price]);

  return (
    <div>
      <Field
        type="text"
        name=""
        value={price}
        placeholder="Enter the price"
        validationRules={['notEmpty']}
        onChange={(e) => setPrice(parseFloat(e.target.value))}
      />
    </div>
  );
};
