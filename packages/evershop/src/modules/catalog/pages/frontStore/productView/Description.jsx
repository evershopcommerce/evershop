/* eslint-disable react/no-danger */
import Editor from '@components/common/Editor';
import PropTypes from 'prop-types';
import React from 'react';

export default function Description({ product: { description } }) {
  return (
    <div className="mt-8 md:mt-12">
      <div className="product-description">
        <Editor rows={description} />
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
