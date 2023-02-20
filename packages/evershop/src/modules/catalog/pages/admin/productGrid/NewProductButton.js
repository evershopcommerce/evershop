import PropTypes from 'prop-types';
import React from 'react';
import Button from '@components/common/form/Button';

export default function NewProductButton({ newProductUrl }) {
  return <Button url={newProductUrl} title="New Product" />;
}

NewProductButton.propTypes = {
  newProductUrl: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 10
};

export const query = `
  query Query {
    newProductUrl: url(routeId: "productNew")
  }
`;
