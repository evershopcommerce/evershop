/* eslint-disable react/no-array-index-key */
/* eslint-disable react/jsx-closing-tag-location */
import PropTypes from 'prop-types';
import React from 'react';
import { ItemOptions } from '@components/admin/oms/orderEdit/items/ItemOptions';

export function Name({ name, options = [] }) {
  return (
    <td>
      <div className="product-column">
        <div>
          <span className="font-semibold">{name}</span>
        </div>
        <ItemOptions options={options} />
      </div>
    </td>
  );
}

Name.propTypes = {
  name: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      option_name: PropTypes.string,
      values: PropTypes.arrayOf(
        PropTypes.shape({
          value_text: PropTypes.string,
          extra_price: PropTypes.number
        })
      )
    })
  )
};

Name.defaultProps = {
  options: undefined
};
