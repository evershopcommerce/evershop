import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle
} from '@components/common/ui/Item.js';
import {
  RadioGroup,
  RadioGroupItem
} from '@components/common/ui/RadioGroup.js';
import { useCheckout } from '@components/frontStore/checkout/CheckoutContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { CustomerAddressGraphql } from '@evershop/evershop/types/customerAddress';
import { Package } from 'lucide-react';
import React from 'react';

interface ShippingMethod {
  code: string;
  /**
   * Provider code (e.g., 'core', 'usps'). Threaded through to
   * `addShippingMethod` so the server can call the right provider's
   * validateMethod. Optional at the type level for back-compat with cached
   * availableShippingMethods data that pre-dates phase 4.
   */
  providerCode?: string;
  name: string;
  /** Carrier display name (e.g., 'USPS'). Themes can render it next to name. */
  carrier?: string;
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
          className="border border-border rounded-lg p-4 mb-3 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-muted rounded-full"></div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-20"></div>
                <div className="h-3 bg-muted rounded w-40"></div>
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className="h-3 bg-muted rounded w-12"></div>
              <div className="h-4 bg-muted rounded w-16"></div>
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
  const { formState, setValue, watch } = form;
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
    <div
      className="checkout-shipment"
      aria-invalid={formState.errors.shippingMethod ? 'true' : 'false'}
      tabIndex={-1}
    >
      <Card className="rounded-lg border border-border shadow-none ring-0">
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              <span>{_('Shipping Method')}</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ShippingMethodSkeleton />
          ) : (
            <>
              <div className="shipping-methods-list">
                <input
                  type="hidden"
                  {...form.register('shippingMethod', { required: true })}
                  defaultValue={currentValue}
                />
                {methods?.length === 0 ? (
                  <div className="text-left">
                    {!shippingAddress?.country || !shippingAddress?.province ? (
                      <div>
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
                          {_(
                            'No shipping options are available for your location'
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <RadioGroup
                    value={currentValue ?? ''}
                    onValueChange={(value) => {
                      const method = methods.find((m) => m.code === value);
                      if (method) {
                        handleMethodSelect(method);
                      } else {
                        setValue('shippingMethod', value);
                      }
                    }}
                  >
                    {methods.map((method: ShippingMethod) => (
                      // The whole card selects the method, not just the radio
                      // dot. Base UI radios react only to pointer events on
                      // their own [role="radio"] element — a wrapping <label>
                      // cannot activate them — so the card carries a click
                      // handler; clicks on the radio itself are skipped
                      // (its own handler fires onValueChange) to avoid
                      // double-firing. The <label> stays for the radio's
                      // accessible name (method + price).
                      <Item
                        key={method.code}
                        render={<label />}
                        onClick={(e: React.MouseEvent) => {
                          if (
                            (e.target as HTMLElement).closest('[role="radio"]')
                          ) {
                            return;
                          }
                          if (!isProcessing && currentValue !== method.code) {
                            handleMethodSelect(method);
                          }
                        }}
                        className={`cursor-pointer transition-colors ${
                          currentValue === method.code
                            ? 'border-primary bg-primary-foreground/10 hover:border-primary'
                            : 'border-border'
                        } ${
                          isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <ItemContent>
                          <ItemTitle>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem
                                id={`shipping-method-${method.code}`}
                                value={method.code}
                                disabled={isProcessing}
                              />
                              <span className="select-none">
                                {method.name}
                              </span>
                            </div>
                          </ItemTitle>
                          {method.description && (
                            <ItemDescription>
                              {method.description}
                            </ItemDescription>
                          )}
                        </ItemContent>
                        <ItemActions>
                          {method.cost ? (
                            <>
                              {method.cost.value > 0 ? (
                                <div className="font-medium">
                                  {method.cost.text}
                                </div>
                              ) : (
                                <>
                                  <div className="text-sm text-muted-foreground line-through">
                                    {method.cost.text}
                                  </div>
                                  <div className="font-medium text-primary uppercase">
                                    {_('Free')}
                                  </div>
                                </>
                              )}
                            </>
                          ) : (
                            <div className="font-medium text-foreground">
                              {_('Contact for pricing')}
                            </div>
                          )}
                        </ItemActions>
                      </Item>
                    ))}
                  </RadioGroup>
                )}
              </div>
              {formState.errors.shippingMethod && (
                <div className="text-destructive text-sm mt-2">
                  {formState.errors.shippingMethod?.message?.toString() ||
                    _('Please select a shipping method')}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
