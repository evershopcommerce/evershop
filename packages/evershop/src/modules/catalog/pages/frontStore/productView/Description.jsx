/* eslint-disable react/no-danger */
import { CKEditor } from '@components/common/CKEditor';
import PropTypes from 'prop-types';
import React from 'react';

export default function Description({ product: { description } }) {
  return (
    <div className="mt-2 md:mt-3">
      <div className="product-description">
        <CKEditor content={description} />
      </div>
    </div>
  );
}

Description.propTypes = {
  product: PropTypes.shape({
    description: PropTypes.string
  }).isRequired
};

export const layout = {
  areaId: 'productPageMiddleRight',
  sortOrder: 50
};

export const query = `
  query Query {
    product (id: getContextValue('productId')) {
      description
    }
  }`;
