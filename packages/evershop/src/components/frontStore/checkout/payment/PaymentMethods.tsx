/* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
import { useCheckout } from '@components/frontStore/checkout/CheckoutContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface PaymentMethod {
  code: string;
  name: string;
  cost?: {
    value: number;
    text: string;
  };
  description?: string;
}

// Skeleton component for loading state
function PaymentMethodSkeleton() {
  return (
    <div className="payment-method-skeleton">
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

export function PaymentMethods({
  methods,
  isLoading
}: {
  methods: PaymentMethod[];
  isLoading?: boolean;
}) {
  const { form, registeredPaymentComponents } = useCheckout();
  const { register, formState, watch, setValue } = form;

  // Watch the current payment method value
  const selectedPaymentMethod = watch('paymentMethod');

  // Helper function to get payment component for a method
  const getPaymentComponent = (methodCode: string) => {
    return registeredPaymentComponents[methodCode] || null;
  };

  // Helper function to render a component safely
  const renderComponent = (
    component: React.ComponentType<any> | undefined,
    props: any
  ) => {
    return component ? React.createElement(component, props) : null;
  };

  return (
    <div className="checkout-payment-methods">
      {isLoading ? (
        <PaymentMethodSkeleton />
      ) : (
        <>
          <div className="payment-methods-list">
            {methods?.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                <div className="mb-2">{_('No payment methods available')}</div>
              </div>
            ) : (
              methods.map((method: PaymentMethod) => {
                const isSelected = selectedPaymentMethod === method.code;
                const component = getPaymentComponent(method.code);

                return (
                  <div
                    key={method.code}
                    className={`border rounded-lg mb-3 transition-all overflow-hidden duration-200 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="p-3">
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          {...register('paymentMethod')}
                          value={method.code}
                          required
                          checked={isSelected}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <div
                          className="font-normal text-gray-900 w-full cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault();
                            if (formState.disabled) {
                              return;
                            }
                            // Set selected payment method
                            setValue('paymentMethod', method.code);
                          }}
                        >
                          {component?.nameRenderer
                            ? renderComponent(component.nameRenderer, {
                                isSelected
                              })
                            : _(method.name)}
                        </div>
                      </div>
                    </div>

                    {/* Accordion content - Form renderer */}
                    {isSelected && component?.formRenderer && (
                      <div className="border-t border-gray-200 p-3 bg-white">
                        {renderComponent(component.formRenderer, {
                          isSelected: true
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {formState.errors.paymentMethod && (
            <div className="text-red-500 text-sm mt-2">
              {formState.errors.paymentMethod?.message?.toString() ||
                _('Please select a payment method')}
            </div>
          )}
        </>
      )}
    </div>
  );
}
