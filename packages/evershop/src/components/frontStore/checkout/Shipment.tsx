import Area from '@components/common/Area.js';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
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
import { MapPin } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { useWatch } from 'react-hook-form';
import { toast } from 'react-toastify';

export function Shipment() {
  const {
    data: {
      shippingAddress,
      noShippingRequired,
      availableShippingMethods,
      shippingMethod: selectedShippingMethod
    },
    loadingStates: { fetchingShippingMethods }
  } = useCartState();

  // Early return if no shipping is required
  if (noShippingRequired) {
    return null;
  }

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

  const updateShipment = async (method: {
    code: string;
    name: string;
    providerCode: string;
  }) => {
    try {
      const validate = await form.trigger('shippingAddress');
      if (!validate) {
        return false;
      }
      const shippingAddress = form.getValues('shippingAddress');

      // `providerCode` MUST flow through. Silently defaulting to 'core' (the
      // earlier behavior) mis-routes any non-core method through
      // `resolveShippingQuote(coreProvider, …)`, which then fails validation
      // because the method isn't in Core's list — surfacing as "method no
      // longer available." availableShippingMethods always carries it from
      // the server (AvailableShippingMethod.providerCode is `String!`); if
      // the field is missing here that's a strip bug upstream, not a
      // legitimate fallback case.
      if (!method.providerCode) {
        throw new Error(
          `Shipping method "${method.code}" is missing providerCode — refusing to guess.`
        );
      }
      await addShippingAddress(shippingAddress);
      await addShippingMethod(method.code, method.name, method.providerCode);
      // Stash BOTH method code and provider in checkoutData so the eventual
      // POST to `cart.checkoutApi` carries the provider through. The server's
      // checkout service no longer assumes 'core'; without
      // `shippingProvider` the request would 422 with "Selected shipping
      // method is no longer available" when the cart's persisted provider
      // disagrees.
      updateCheckoutData({
        shippingAddress,
        shippingMethod: method.code,
        shippingProvider: method.providerCode
      });
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : _('Failed to update shipment')
      );
      return false;
    }
  };

  return (
    <>
      <Area id="checkoutShipmentBefore" />
      <div className="checkout__shipment space-y-6 mt-6">
        <Card className="transition-all overflow-hidden duration-200">
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                <span>{_('Shipping Address')}</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerAddressForm
              areaId="checkoutShippingAddressForm"
              fieldNamePrefix="shippingAddress"
              address={shippingAddress}
            />
          </CardContent>
        </Card>
        <Area id="checkoutShippingMethodsBefore" noOuter />
        <ShippingMethods
          methods={availableShippingMethods?.map((method) => ({
            ...method,
            isSelected: method.code === selectedShippingMethod
          }))}
          shippingAddress={shippingAddress}
          onSelect={updateShipment}
          isLoading={fetchingShippingMethods}
        />
        <Area id="checkoutShippingMethodsAfter" noOuter />
      </div>
      <Area id="checkoutShipmentAfter" />
    </>
  );
}
