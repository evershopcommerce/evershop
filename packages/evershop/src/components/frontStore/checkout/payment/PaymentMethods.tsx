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
import { Skeleton } from '@components/common/ui/Skeleton.js';
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
          className="border border-border rounded-lg p-4 mb-3 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Skeleton className="w-4 h-4" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
            <div className="text-right space-y-1">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-4 w-16" />
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
  const { formState, watch, setValue } = form;

  const selectedPaymentMethod = watch('paymentMethod');

  const getPaymentComponent = (methodCode: string) => {
    return registeredPaymentComponents[methodCode] || null;
  };

  const renderComponent = (
    component: React.ComponentType<any> | undefined,
    props: any
  ) => {
    return component ? React.createElement(component, props) : null;
  };

  return (
    <div className="checkout-payment-methods">
      <Item className="px-0 py-0">
        <ItemContent className="gap-2">
          <ItemTitle>{_('Pick a payment method')}</ItemTitle>
          <ItemDescription>
            {isLoading ? (
              <PaymentMethodSkeleton />
            ) : (
              <>
                <div className="payment-methods-list">
                  {methods?.length === 0 ? (
                    <div className="text-muted-foreground text-center py-8">
                      <div className="mb-2">
                        {_('No payment methods available')}
                      </div>
                    </div>
                  ) : (
                    <RadioGroup
                      value={selectedPaymentMethod ?? ''}
                      onValueChange={(value) => {
                        setValue('paymentMethod', value);
                      }}
                    >
                      {methods.map((method: PaymentMethod) => {
                        const isSelected =
                          selectedPaymentMethod === method.code;
                        const component = getPaymentComponent(method.code);
                        return (
                          // Whole-box click selects (Base UI radios only
                          // react to pointer events on their [role="radio"]
                          // element, so the box needs its own handler). The
                          // guard skips the radio itself (double-fire) and
                          // any control inside the embedded payment form.
                          <Item
                            key={method.code}
                            variant={'outline'}
                            onClick={(e: React.MouseEvent) => {
                              if (
                                (e.target as HTMLElement).closest(
                                  'input, button, a, select, textarea, iframe, [role="radio"]'
                                )
                              ) {
                                return;
                              }
                              if (!isSelected) {
                                setValue('paymentMethod', method.code);
                              }
                            }}
                            className={`cursor-pointer ${
                              isSelected ? 'border-primary' : ''
                            }`}
                          >
                            <ItemContent>
                              <ItemTitle className="w-full">
                                {/* The row is a <label> implicitly wrapping
                                    the radio so the whole row selects on
                                    click. Only the row — the box also hosts
                                    the payment form when selected, and a
                                    box-wide label would hijack clicks on
                                    those fields. */}
                                <label className="flex items-center space-x-3 w-full cursor-pointer">
                                  <RadioGroupItem
                                    id={`payment-method-${method.code}`}
                                    value={method.code}
                                  />
                                  <span className="w-full select-none">
                                    {component?.nameRenderer
                                      ? renderComponent(
                                          component.nameRenderer,
                                          {
                                            isSelected
                                          }
                                        )
                                      : _(method.name)}
                                  </span>
                                </label>
                              </ItemTitle>
                              {component?.formRenderer && isSelected && (
                                <ItemDescription className="text-inherit overflow-visible">
                                  {renderComponent(component.formRenderer, {
                                    isSelected
                                  })}
                                </ItemDescription>
                              )}
                            </ItemContent>
                          </Item>
                        );
                      })}
                    </RadioGroup>
                  )}
                </div>

                {formState.errors.paymentMethod && (
                  <div className="text-destructive text-sm mt-2">
                    {formState.errors.paymentMethod?.message?.toString() ||
                      _('Please select a payment method')}
                  </div>
                )}
              </>
            )}
          </ItemDescription>
        </ItemContent>
      </Item>
    </div>
  );
}
