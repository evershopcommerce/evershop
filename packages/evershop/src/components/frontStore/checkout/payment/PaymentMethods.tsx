import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle
} from '@components/common/ui/Item.js';
import { Label } from '@components/common/ui/Label.js';
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
    <div className="checkout-payment-methods mt-6">
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
                          <Item
                            key={method.code}
                            variant={'outline'}
                            className={isSelected ? 'border-primary' : ''}
                          >
                            <ItemContent>
                              <ItemTitle className="w-full">
                                <div className="flex items-center space-x-3 w-full">
                                  <RadioGroupItem
                                    id={`payment-method-${method.code}`}
                                    value={method.code}
                                  />
                                  <Label
                                    htmlFor={`payment-method-${method.code}`}
                                    className="w-full"
                                  >
                                    {component?.nameRenderer
                                      ? renderComponent(
                                          component.nameRenderer,
                                          {
                                            isSelected
                                          }
                                        )
                                      : _(method.name)}
                                  </Label>
                                </div>
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
