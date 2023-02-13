import PropTypes from 'prop-types';
import React from 'react';

export default function ProductPriceRow({ areaProps: { row } }) {
  return (
    <td>
      <div>
        <span>{row.price.regular.text}</span>
      </div>
    </td>
  );
}

ProductPriceRow.propTypes = {
  areaProps: PropTypes.shape({
    row: PropTypes.shape({
      price: PropTypes.shape({
        regular: PropTypes.shape({
          text: PropTypes.string.isRequired
        }).isRequired
      }).isRequired
    }).isRequired
  }).isRequired
};
