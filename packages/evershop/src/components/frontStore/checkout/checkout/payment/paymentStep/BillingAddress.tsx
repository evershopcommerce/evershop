import { CheckboxField } from '@components/common/form/CheckboxField.js';
import React from 'react';
import { _ } from '../../../../../../lib/locale/translate/_.js';

interface BillingAddressProps {
  useShippingAddress: boolean;
  setUseShippingAddress: (useShippingAddress: boolean) => void;
}
export function BillingAddress({
  useShippingAddress,
  setUseShippingAddress
}: BillingAddressProps) {
  return (
    <div>
      <CheckboxField
        name="useShippingAddress"
        onChange={(e) => {
          if (e.target.checked) {
            setUseShippingAddress(true);
          } else {
            setUseShippingAddress(false);
          }
        }}
        label={_('My billing address is same as shipping address')}
        checked={useShippingAddress === true}
      />
    </div>
  );
}
