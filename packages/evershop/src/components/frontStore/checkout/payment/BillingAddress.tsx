import { Button } from '@components/common/ui/Button.js';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle
} from '@components/common/ui/Item.js';
import {
  RadioGroup,
  RadioGroupItem
} from '@components/common/ui/RadioGroup.js';
import {
  useCheckout,
  useCheckoutDispatch
} from '@components/frontStore/checkout/CheckoutContext.js';
import CustomerAddressForm from '@components/frontStore/customer/address/addressForm/Index.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import {
  Address,
  CustomerAddressGraphql
} from '@evershop/evershop/types/customerAddress';
import React, { useEffect, useState } from 'react';
import { useWatch } from 'react-hook-form';

export function BillingAddress({
  billingAddress,
  addBillingAddress,
  addingBillingAddress,
  noShippingRequired
}: {
  billingAddress?: CustomerAddressGraphql;
  addBillingAddress?: (address: Address) => Promise<void>;
  addingBillingAddress?: boolean;
  noShippingRequired: boolean;
}) {
  const { form, checkoutData } = useCheckout();
  const { updateCheckoutData } = useCheckoutDispatch();
  const {
    setValue,
    getValues,
    trigger,
    formState: { disabled }
  } = form;

  const shippingAddress = useWatch({
    control: form.control,
    name: 'shippingAddress'
  });

  const billingAddressField = useWatch({
    control: form.control,
    name: 'billingAddress'
  });

  const [useSameAddress, setUseSameAddress] = useState(!noShippingRequired);

  useEffect(() => {
    if (useSameAddress && shippingAddress) {
      updateCheckoutData({ billingAddress: shippingAddress });
    } else if (!useSameAddress) {
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

  const handleGoToPayment = async () => {
    const isValid = await trigger('billingAddress');

    if (isValid && addBillingAddress) {
      const billingAddressData = getValues('billingAddress');
      await addBillingAddress(billingAddressData);
    }
  };

  return (
    <div className="billing-address-section mb-6">
      <Item className="py-0 px-0">
        <ItemContent className="gap-2">
          <ItemTitle>{_('Billing Address')}</ItemTitle>
          <RadioGroup
            value={useSameAddress ? 'same' : 'different'}
            onValueChange={(value) => {
              handleAddressOptionChange(value as string);
            }}
          >
            {!noShippingRequired ? (
              <>
                {/* Whole-box click selects each option (Base UI radios only
                    react to pointer events on their [role="radio"] element,
                    so the boxes carry click handlers). The guard skips the
                    radio itself and, on the second box, the controls of the
                    expanded billing-address form. */}
                <Item
                  variant={'outline'}
                  onClick={(e: React.MouseEvent) => {
                    if (
                      (e.target as HTMLElement).closest('[role="radio"]')
                    ) {
                      return;
                    }
                    if (!useSameAddress) {
                      handleAddressOptionChange('same');
                    }
                  }}
                  className="cursor-pointer"
                >
                  <ItemContent>
                    <ItemTitle>
                      <label className="flex items-center space-x-3 w-full cursor-pointer">
                        <RadioGroupItem id="same-address" value="same" />
                        <span className="select-none">
                          {_('Same as shipping address')}
                        </span>
                      </label>
                    </ItemTitle>
                  </ItemContent>
                </Item>
                <Item
                  variant={'outline'}
                  onClick={(e: React.MouseEvent) => {
                    if (
                      (e.target as HTMLElement).closest(
                        'input, button, a, select, textarea, [role="radio"], [role="combobox"]'
                      )
                    ) {
                      return;
                    }
                    if (useSameAddress) {
                      handleAddressOptionChange('different');
                    }
                  }}
                  className="cursor-pointer"
                >
                  <ItemContent>
                    <ItemTitle>
                      <label className="flex items-center space-x-3 w-full cursor-pointer">
                        <RadioGroupItem
                          id="different-address"
                          value="different"
                        />
                        <span className="select-none">
                          {_('Use a different billing address')}
                        </span>
                      </label>
                    </ItemTitle>

                    {!useSameAddress && (
                      <ItemDescription className="text-inherit mt-3 overflow-visible">
                        <div className="text-inherit bg-white">
                          <CustomerAddressForm
                            areaId="checkoutBillingAddressForm"
                            fieldNamePrefix="billingAddress"
                            countryScope="all"
                            address={undefined} // Always start empty for different address
                          />
                          {noShippingRequired && (
                            <Button
                              onClick={() => handleGoToPayment()}
                              variant="default"
                              isLoading={addingBillingAddress}
                            >
                              {_('Continue to payment')}
                            </Button>
                          )}
                        </div>
                      </ItemDescription>
                    )}
                  </ItemContent>
                </Item>
              </>
            ) : (
              <ItemDescription className="text-inherit mt-3 overflow-visible">
                <div className="text-inherit bg-white">
                  <CustomerAddressForm
                    areaId="checkoutBillingAddressForm"
                    fieldNamePrefix="billingAddress"
                    countryScope="all"
                    address={undefined} // Always start empty for different address
                  />
                  {noShippingRequired && (
                    <Button
                      onClick={() => handleGoToPayment()}
                      variant="default"
                      isLoading={addingBillingAddress}
                      className="mt-4"
                    >
                      {_('Continue to payment')}
                    </Button>
                  )}
                </div>
              </ItemDescription>
            )}
          </RadioGroup>
        </ItemContent>
      </Item>
    </div>
  );
}
