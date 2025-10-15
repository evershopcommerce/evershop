import {
  useCartDispatch,
  useCartState
} from '@components/frontStore/cart/CartContext.js';
import {
  useCheckout,
  useCheckoutDispatch
} from '@components/frontStore/checkout/CheckoutContext.js';
import { ShippingMethods } from '@components/frontStore/checkout/shipment/ShippingMethods.js';
import CustomerAddressForm from '@components/frontStore/customer/address/addressForm/Index.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React, { useEffect, useRef } from 'react';
import { useWatch } from 'react-hook-form';
import { toast } from 'react-toastify';

export function Shipment() {
  const {
    data: {
      shippingAddress,
      availableShippingMethods,
      shippingMethod: selectedShippingMethod
    },
    loadingStates: { fetchingShippingMethods }
  } = useCartState();
  const {
    addShippingAddress,
    addShippingMethod,
    fetchAvailableShippingMethods
  } = useCartDispatch();
  const { form } = useCheckout();
  const { updateCheckoutData } = useCheckoutDispatch();

  // Use useWatch for better performance and cleaner code
  const watchedShippingAddress = useWatch({
    control: form.control,
    name: 'shippingAddress'
  });

  const dirtyFields = form.formState.dirtyFields;
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchParamsRef = useRef<{
    country?: string;
    province?: string;
    postcode?: string;
  } | null>(
    // Initialize with current shipping address if available
    shippingAddress
      ? {
          country: shippingAddress.country?.code,
          province: shippingAddress.province?.code,
          postcode: shippingAddress.postcode || undefined
        }
      : null
  );

  useEffect(() => {
    const fetchShippingMethods = async () => {
      try {
        const country = form.getValues('shippingAddress.country');
        const province = form.getValues('shippingAddress.province');
        const postcode = form.getValues('shippingAddress.postcode');

        if (!country) {
          return;
        }

        // Check if parameters have actually changed
        const currentParams = { country, province, postcode };
        const lastParams = lastFetchParamsRef.current;

        if (
          lastParams &&
          lastParams.country === country &&
          lastParams.province === province &&
          lastParams.postcode === postcode
        ) {
          // Parameters haven't changed, skip API call
          return;
        }

        // Cache the current parameters
        lastFetchParamsRef.current = currentParams;

        await fetchAvailableShippingMethods({ country, province, postcode });
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : _('Failed to update shipment')
        );
      }
    };

    if (watchedShippingAddress && dirtyFields.shippingAddress) {
      // Clear existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Set new timeout
      debounceTimeoutRef.current = setTimeout(() => {
        fetchShippingMethods();
      }, 800);
    }

    // Cleanup function
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [watchedShippingAddress, dirtyFields.shippingAddress]); // Clean dependency array

  const updateShipment = async (method: { code: string; name: string }) => {
    try {
      const validate = await form.trigger('shippingAddress');
      if (!validate) {
        return false;
      }
      const shippingAddress = form.getValues('shippingAddress');

      await addShippingAddress(shippingAddress);
      await addShippingMethod(method.code, method.name);
      updateCheckoutData({ shippingAddress, shippingMethod: method.code });
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : _('Failed to update shipment')
      );
      return false;
    }
  };

  return (
    <div className="checkout-shipment">
      <h2>{_('Delivery')}</h2>
      <CustomerAddressForm
        areaId="checkoutShippingAddressForm"
        fieldNamePrefix="shippingAddress"
        address={shippingAddress}
      />
      <ShippingMethods
        methods={availableShippingMethods?.map((method) => ({
          ...method,
          isSelected: method.code === selectedShippingMethod
        }))}
        shippingAddress={shippingAddress}
        onSelect={updateShipment}
        isLoading={fetchingShippingMethods}
      />
    </div>
  );
}
