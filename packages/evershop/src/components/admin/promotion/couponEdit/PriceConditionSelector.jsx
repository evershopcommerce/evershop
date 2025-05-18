import { Field } from '@components/common/form/Field';
import PropTypes from 'prop-types';
import React from 'react';

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
        name=""
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
      PropTypes.arrayOf(
        PropTypes.oneOfType([PropTypes.string, PropTypes.number])
      ),
      PropTypes.string,
      PropTypes.number
    ])
  }).isRequired,
  setCondition: PropTypes.func.isRequired
};

export const layout = {
  areaId: 'couponProductConditionValue',
  sortOrder: 15
};
