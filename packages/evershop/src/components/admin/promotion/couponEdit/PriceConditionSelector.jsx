import PropTypes from 'prop-types';
import React from 'react';
import { Field } from '@components/common/form/Field';

export default function PriceConditionSelector({ condition, setCondition }) {
  const [price, setPrice] = React.useState(condition.value || '');

  React.useEffect(() => {
    setCondition({
      ...condition,
      value: price
    });
  }, [price]);

  if (condition.key !== 'price') {
    return null;
  }

  return (
    <div>
      <Field
        type="text"
        value={price}
        placeholder="Enter the price"
        validationRules={['notEmpty']}
        onChange={(e) => setPrice(e.target.value)}
      />
    </div>
  );
}

PriceConditionSelector.propTypes = {
  condition: PropTypes.shape({
    key: PropTypes.string,
    value: PropTypes.oneOfType([
      PropTypes.arrayOf(PropTypes.string),
      PropTypes.string
    ])
  }).isRequired,
  setCondition: PropTypes.func.isRequired
};

export const layout = {
  areaId: 'couponProductConditionValue',
  sortOrder: 15
};
