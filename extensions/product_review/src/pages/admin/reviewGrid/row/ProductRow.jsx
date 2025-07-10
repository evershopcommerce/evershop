import PropTypes from 'prop-types';
import React from 'react';

function ProductRow({ product }) {
  return (
    <td width="45%">
      <a href={product.editUrl}>{product.name}</a>
    </td>
  );
}

ProductRow.propTypes = {
  product: PropTypes.shape({
    editUrl: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired
  }).isRequired
};

export default ProductRow;
