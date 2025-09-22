import Area from '@components/common/Area.js';
import Button from '@components/common/Button.js';
import { Form } from '@components/common/form/Form.js';
import { NumberField } from '@components/common/form/NumberField.js';
import { useProduct } from '@components/frontStore/product/productContext.js';
import Variants from '@components/frontStore/product/Variants.js';
import {
  AddToCart,
  AddToCartActions,
  AddToCartState
} from '@components/frontStore/AddToCart.js';
import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { _ } from '../../../lib/locale/translate/_.js';

export function ProductForm() {
  const {
    sku,
    inventory: { isInStock }
  } = useProduct();
  const form = useForm();
  const qty = form.watch('qty');

  return (
    <Form id="productForm" method="POST" submitBtn={false} form={form}>
      <Area
        id="productSinglePageForm"
        coreComponents={[
          {
            component: {
              default: <Variants />
            },
            sortOrder: 10,
            id: 'variants'
          },
          {
            component: {
              default: (
                <AddToCart
                  product={{
                    sku: sku,
                    isInStock: isInStock
                  }}
                  qty={1}
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
                    <>
                      {state.isInStock === true && (
                        <Button
                          title={_('ADD TO CART')}
                          outline
                          isLoading={state.isLoading}
                          onAction={() => {
                            form.trigger().then((isValid) => {
                              if (isValid) {
                                actions.addToCart();
                              }
                            });
                          }}
                          className="w-full py-3 text-lg font-medium !rounded-full mt-8"
                        />
                      )}
                      {state.isInStock === false && (
                        <Button
                          title={_('SOLD OUT')}
                          onAction={() => {}}
                          className="w-full py-3 text-lg font-medium !rounded-full"
                        />
                      )}
                    </>
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
