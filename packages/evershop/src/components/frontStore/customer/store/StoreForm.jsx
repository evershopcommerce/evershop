/* eslint-disable react/destructuring-assignment */
/* eslint-disable react/prop-types */
import PropTypes from 'prop-types';
import React from 'react';
import { Field } from '@components/common/form/Field';
import Area from '@components/common/Area';
import { _ } from '@evershop/evershop/src/lib/locale/translate';

export function StoreForm({
  store = {},
  formId = 'storeForm',
  areaId = 'storeForm'
}) {
  return (
    <Field
      id={formId}
      name='shopName'
      value={store?.shopName}
      placeholder={_('Store Name')}
      label={_('Store Name')}
      type="text"
      validationRules={['notEmpty']}
    />
  );
}

StoreForm.propTypes = {
  store: PropTypes.shape({
    shopName: PropTypes.string,
  }),
  areaId: PropTypes.string,
  formId: PropTypes.string,
};

StoreForm.defaultProps = {
  store: {},
  areaId: 'storeForm',
  formId: 'storeForm'
};
