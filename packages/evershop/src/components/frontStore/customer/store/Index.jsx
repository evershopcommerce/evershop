import PropTypes from 'prop-types';
import React from 'react';
import { StoreForm } from './StoreForm';

export default function Index({
  store = {},
  formId = 'storeForm',
  areaId = 'storeForm'
}) {
  return (
    <StoreForm
      store={store}
      formId={formId}
      areaId={areaId}
    />
  );
}

Index.propTypes = {
  store: PropTypes.shape({
    shopName: PropTypes.string,
    rating: PropTypes.string,
    totalSales: PropTypes.number,
    productCount: PropTypes.number,
    updateApi: PropTypes.string,
    accessApi: PropTypes.string
  }),
  areaId: PropTypes.string,
  formId: PropTypes.string
};

Index.defaultProps = {
  address: {},
  areaId: 'storeForm',
  formId: 'storeForm'
};
