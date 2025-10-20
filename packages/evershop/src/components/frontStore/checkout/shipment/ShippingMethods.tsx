import { useCheckout } from '@components/frontStore/checkout/CheckoutContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { CustomerAddressGraphql } from '@evershop/evershop/types/customerAddress';
import React from 'react';

interface ShippingMethod {
  code: string;
  name: string;
  cost?: {
    value: number;
    text: string;
  };
  description?: string;
  isSelected?: boolean;
}

// Skeleton component for loading state
function ShippingMethodSkeleton() {
  return (
    <div className="shipping-method-skeleton">
      {[1, 2, 3, 4].map((index) => (
        <div
          key={index}
          className="border border-gray-200 rounded-lg p-4 mb-3 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-3 bg-gray-200 rounded w-40"></div>
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className="h-3 bg-gray-200 rounded w-12"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ShippingMethods({
  methods,
  shippingAddress,
  isLoading,
  onSelect
}: {
  methods: ShippingMethod[];
  shippingAddress?: CustomerAddressGraphql;
  isLoading?: boolean;
  onSelect?: (method: ShippingMethod) => Promise<boolean> | boolean;
}) {
  const { form } = useCheckout();
  const { register, formState, setValue, watch } = form;
  const [isProcessing, setIsProcessing] = React.useState(false);
  const currentValue = watch('shippingMethod');

  const handleMethodSelect = async (method: ShippingMethod) => {
    if (!onSelect) {
      // If no onSelect function provided, allow normal behavior
      setValue('shippingMethod', method.code);
      return;
    }

    if (isProcessing || formState.disabled) {
      return;
    }

    try {
      setIsProcessing(true);
      const result = await Promise.resolve(onSelect(method));

      if (result) {
        // Only update the form value if onSelect returns true
        setValue('shippingMethod', method.code);
      }
      // If result is false, keep the current selection
    } catch (error) {
      // Keep the current selection on error
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="checkout-shipment">
      <h2 className="text-lg font-medium mb-4">{_('Shipping method')}</h2>

      {isLoading ? (
        <ShippingMethodSkeleton />
      ) : (
        <>
          <div className="shipping-methods-list">
            {methods?.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                <input
                  type="hidden"
                  {...form.register('shippingMethod', { required: true })}
                  value=""
                />
                {!shippingAddress?.country || !shippingAddress?.province ? (
                  <div>
                    <div className="mb-2">
                      {_('Please complete your shipping address')}
                    </div>
                    <div className="text-sm">
                      {_(
                        'Available shipping methods will appear once you provide your address details'
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="mb-2">
                      {_('No shipping methods available')}
                    </div>
                    <div className="text-sm">
                      {_('No shipping options are available for your location')}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              methods.map((method: ShippingMethod) => (
                <div
                  key={method.code}
                  className={`border rounded-lg p-3 mb-3 cursor-pointer transition-colors ${
                    currentValue === method.code
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        {...register('shippingMethod', {
                          required: _('Please select a shipping method')
                        })}
                        value={method.code}
                        checked={currentValue === method.code}
                        onChange={() => {}} // Controlled by onClick handler
                        disabled={isProcessing}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 disabled:opacity-50"
                      />
                      <div>
                        <div className="font-normal text-gray-900 flex items-center">
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              !isProcessing && handleMethodSelect(method);
                            }}
                          >
                            {_(method.name)}
                          </a>
                          {isProcessing && currentValue === method.code && (
                            <div className="ml-2 w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          )}
                        </div>
                        {method.description && (
                          <div className="text-sm text-gray-500 mt-1">
                            {_(method.description)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {method.cost ? (
                        <>
                          {method.cost.value > 0 ? (
                            <div className="font-medium text-gray-900">
                              {method.cost.text}
                            </div>
                          ) : (
                            <>
                              <div className="text-sm text-gray-500 line-through">
                                {method.cost.text}
                              </div>
                              <div className="font-medium text-green-600">
                                {_('FREE')}
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <div className="font-medium text-gray-900">
                          {_('Contact for pricing')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {formState.errors.shippingMethod && (
            <div className="text-red-500 text-sm mt-2">
              {formState.errors.shippingMethod?.message?.toString() ||
                _('Please select a shipping method')}
            </div>
          )}
        </>
      )}
    </div>
  );
}
