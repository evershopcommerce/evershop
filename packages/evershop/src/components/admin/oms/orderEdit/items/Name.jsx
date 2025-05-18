import { ItemVariantOptions } from '@components/admin/oms/orderEdit/items/ItemVariantOptions';
import PropTypes from 'prop-types';
import React from 'react';

export function Name({ name, productSku, productUrl, variantOptions = [] }) {
  return (
    <td>
      <div className="product-column">
        <div>
          <span className="font-semibold">
            <a href={productUrl}>{name}</a>
          </span>
        </div>
        <div className="text-gray-500">
          <span className="font-semibold">SKU: </span>
          <span>{productSku}</span>
        </div>
        <ItemVariantOptions options={variantOptions} />
      </div>
    </td>
  );
}

Name.propTypes = {
  name: PropTypes.string.isRequired,
  productSku: PropTypes.string.isRequired,
  productUrl: PropTypes.string.isRequired,
  variantOptions: PropTypes.arrayOf(
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
  variantOptions: []
};
