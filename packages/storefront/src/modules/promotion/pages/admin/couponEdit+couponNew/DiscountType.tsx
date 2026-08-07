import Area from '@components/common/Area.js';
import { RadioGroupField } from '@components/common/form/RadioGroupField.js';
import React from 'react';
import { get } from '../../../../../lib/util/get.js';
import { BuyXGetY } from './components/BuyXGetY.js';
import { TargetProducts } from './components/TargetProducts.js';
import { Coupon } from './General.js';

interface DiscountTypeProps {
  coupon: Coupon;
}
export default function DiscountType({ coupon }: DiscountTypeProps) {
  const targetProducts = get(coupon, 'targetProducts', {});
  const buyxGety = get(coupon, 'buyxGety', []);

  return (
    <div>
      <div>
        <Area
          id="couponFormDiscountType"
          coreComponents={[
            {
              component: {
                default: (
                  <RadioGroupField
                    required
                    validation={{ required: 'Discount type is required' }}
                    options={[
                      {
                        value: 'fixed_discount_to_entire_order',
                        label: 'Fixed discount to entire order'
                      },
                      {
                        value: 'percentage_discount_to_entire_order',
                        label: 'Percentage discount to entire order'
                      },
                      {
                        value: 'fixed_discount_to_specific_products',
                        label: 'Fixed discount to specific products'
                      },
                      {
                        value: 'percentage_discount_to_specific_products',
                        label: 'Percentage discount to specific products'
                      },
                      { value: 'buy_x_get_y', label: 'Buy X get Y' }
                    ]}
                    defaultValue={get(coupon, 'discountType', '')}
                    name="discount_type"
                  />
                )
              },
              sortOrder: 10
            }
          ]}
        />
      </div>
      <div className="mt-2">
        <TargetProducts
          products={get(targetProducts, 'products', [])}
          maxQty={get<number>(targetProducts, 'maxQty', 0)}
        />
        <BuyXGetY
          requireProducts={buyxGety}
          discountType={get(coupon, 'discountType', '')}
        />
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'couponEditDiscountType',
  sortOrder: 30
};

export const query = `
  query Query {
    coupon(id: getContextValue('couponId', null)) {
      discountType
      targetProducts {
        maxQty
        products {
          key
          operator
          value
          qty
        }
      }
      buyxGety {
        sku
        buyQty
        getQty
        maxY
        discount
      }
    }
  }
`;
