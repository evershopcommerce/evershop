import Area from '@components/common/Area.js';
import { Form } from '@components/common/form/Form.js';
import { NumberField } from '@components/common/form/NumberField.js';
import { Button } from '@components/common/ui/Button.js';
import {
  AddToCart,
  AddToCartActions,
  AddToCartState
} from '@components/frontStore/cart/AddToCart.js';
import { useProduct } from '@components/frontStore/catalog/ProductContext.js';
import { VariantSelector } from '@components/frontStore/catalog/VariantSelector.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

export function ProductSingleForm() {
  const {
    price,
    sku,
    inventory: { isInStock }
  } = useProduct();
  const form = useForm();
  const [addingToCart, setAddingToCart] = React.useState(false);
  return (
    <Form id="productForm" method="POST" submitBtn={false} form={form}>
      <Area
        id="productSinglePageForm"
        coreComponents={[
          {
            component: {
              default: (
                <div className="product__single__price text-2xl">
                  {price.regular.text}
                </div>
              )
            },
            sortOrder: 5,
            id: 'price'
          },
          {
            component: {
              default: <VariantSelector />
            },
            sortOrder: 10,
            id: 'variantSelector'
          },
          {
            component: {
              default: (
                <AddToCart
                  product={{
                    sku: sku,
                    isInStock: isInStock
                  }}
                  qty={form.watch('qty') || 1}
                  onSuccess={() => {
                    // To show the mini cart after adding a product to cart
                  }}
                  onError={(errorMessage) => {
                    toast.error(
                      errorMessage || _('Failed to add product to cart')
                    );
                  }}
                >
                  {(state: AddToCartState, actions: AddToCartActions) => (
                    <div className="mt-6 space-y-3">
                      {state.isInStock === true && (
                        <>
                          <NumberField
                            name="qty"
                            label={_('Quantity')}
                            className="w-24"
                            min={1}
                            required
                            placeholder={_('Quantity')}
                            defaultValue={1}
                            wrapperClassName="w-1/2"
                          />
                          <Button
                            variant={'default'}
                            size={'lg'}
                            onClick={() => {
                              form
                                .trigger()
                                .then((isValid) => {
                                  if (isValid) {
                                    setAddingToCart(true);
                                    actions.addToCart();
                                  }
                                })
                                .finally(() => {
                                  setAddingToCart(false);
                                });
                            }}
                            className="w-full py-6 uppercase"
                            isLoading={addingToCart || state.isLoading}
                          >
                            {_('Add to cart')}
                          </Button>
                        </>
                      )}
                      {state.isInStock === false && (
                        <Button
                          onClick={() => {}}
                          className="w-full py-6 uppercase"
                          disabled
                        >
                          {_('Sold out')}
                        </Button>
                      )}
                    </div>
                  )}
                </AddToCart>
              )
            },
            sortOrder: 30,
            id: 'addToCartButton'
          }
        ]}
      />
    </Form>
  );
}
