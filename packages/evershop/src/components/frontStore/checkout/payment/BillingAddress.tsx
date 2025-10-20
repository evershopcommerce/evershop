import {
  useCheckout,
  useCheckoutDispatch
} from '@components/frontStore/checkout/CheckoutContext.js';
import CustomerAddressForm from '@components/frontStore/customer/address/addressForm/Index.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { CustomerAddressGraphql } from '@evershop/evershop/types/customerAddress';
import React, { useEffect, useState } from 'react';
import { useWatch } from 'react-hook-form';

export function BillingAddress({
  billingAddress
}: {
  billingAddress?: CustomerAddressGraphql;
}) {
  const { form, checkoutData } = useCheckout();
  const { updateCheckoutData } = useCheckoutDispatch();
  const {
    register,
    setValue,
    getValues,
    formState: { disabled }
  } = form;

  // Watch shipping address changes
  const shippingAddress = useWatch({
    control: form.control,
    name: 'shippingAddress'
  });

  const billingAddressField = useWatch({
    control: form.control,
    name: 'billingAddress'
  });

  // State for radio selection
  const [useSameAddress, setUseSameAddress] = useState(true);

  // Effect to sync billing address with shipping when "same address" is selected
  useEffect(() => {
    if (useSameAddress && shippingAddress) {
      // Copy shipping address to billing address
      updateCheckoutData({ billingAddress: shippingAddress });
    } else if (!useSameAddress) {
      // Clear billing address when switching to different address
      setValue('billingAddress', billingAddress);
    }
  }, [useSameAddress, checkoutData.shippingAddress]);

  useEffect(() => {
    if (!useSameAddress) {
      const billingAddress = { ...getValues('billingAddress') };
      updateCheckoutData({ billingAddress });
    }
  }, [billingAddressField]);

  const handleAddressOptionChange = (value: string) => {
    const isSameAddress = value === 'same';
    if (isSameAddress === useSameAddress || disabled) {
      return;
    }
    setUseSameAddress(isSameAddress);
    if (!isSameAddress) {
      updateCheckoutData({ billingAddress: undefined });
    } else if (checkoutData.shippingAddress) {
      updateCheckoutData({ billingAddress: checkoutData.shippingAddress });
    }
  };

  return (
    <div className="billing-address-section">
      <h3 className="text-lg font-medium mb-4">{_('Billing Address')}</h3>

      {/* Radio options */}
      <div className="mb-6 space-y-3">
        <div
          className={`border rounded-lg transition-all duration-200 cursor-pointer ${
            useSameAddress
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="p-3">
            <div className="flex items-center space-x-3">
              <input
                type="radio"
                id="same-address"
                value="same"
                checked={useSameAddress}
                onChange={(e) => handleAddressOptionChange(e.target.value)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div>
                <a
                  href="#"
                  className="font-normal cursor-pointer text-gray-900"
                  onClick={(e) => {
                    e.preventDefault();
                    handleAddressOptionChange('same');
                  }}
                >
                  {_('Same as shipping address')}
                </a>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`border rounded-lg transition-all overflow-hidden duration-200  ${
            !useSameAddress
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="p-3">
            <div className="flex items-center space-x-3">
              <input
                type="radio"
                {...register('useSameAddres')}
                id="different-address"
                value="different"
                checked={!useSameAddress}
                onChange={(e) => handleAddressOptionChange(e.target.value)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div>
                <a
                  href="#"
                  className="font-normal cursor-pointer text-gray-900"
                  onClick={(e) => {
                    e.preventDefault();
                    handleAddressOptionChange('different');
                  }}
                >
                  {_('Use a different billing address')}
                </a>
              </div>
            </div>
          </div>

          {/* Billing address form inside the card */}
          {!useSameAddress && (
            <div className="border-t border-gray-200 p-3 bg-white">
              <CustomerAddressForm
                areaId="checkoutBillingAddressForm"
                fieldNamePrefix="billingAddress"
                address={undefined} // Always start empty for different address
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
