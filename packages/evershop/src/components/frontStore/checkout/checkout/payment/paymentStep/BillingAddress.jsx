import { Field } from '@components/common/form/Field';
import PropTypes from 'prop-types';
import React from 'react';
import { _ } from '../../../../../../lib/locale/translate/_.js';

export function BillingAddress({ useShippingAddress, setUseShippingAddress }) {
  return (
    <div>
      <Field
        type="checkbox"
        formId="checkoutBillingAddressForm"
        name="useShippingAddress"
        onChange={(e) => {
          if (e.target.checked) {
            setUseShippingAddress(true);
          } else {
            setUseShippingAddress(false);
          }
        }}
        label={_('My billing address is same as shipping address')}
        isChecked={useShippingAddress === true}
      />
    </div>
  );
}

BillingAddress.propTypes = {
  setUseShippingAddress: PropTypes.func.isRequired,
  useShippingAddress: PropTypes.bool.isRequired
};
