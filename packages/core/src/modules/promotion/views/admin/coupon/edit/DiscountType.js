import React from 'react';
import Area from '../../../../../../lib/components/Area';
import { Field } from '../../../../../../lib/components/form/Field';
import { useAppState } from '../../../../../../lib/context/app';
import { get } from '../../../../../../lib/util/get';
import { BuyXGetY } from './BuyXGetY';
import { TargetProducts } from './TargetProduct';

export function DiscountType() {
  const coupon = get(useAppState(), 'coupon', {});

  let target_products = {};
  if (coupon.target_products) {
    try {
      target_products = JSON.parse(coupon.target_products);
    } catch (e) {
      target_products = {};
    }
  }

  let buyx_gety = [];
  if (coupon.buyx_gety) {
    try {
      buyx_gety = JSON.parse(coupon.buyx_gety);
    } catch (e) {
      buyx_gety = [];
    }
  }

  return (
    <div>
      <div>
        <Area
          id="couponFormDiscountType"
          coreComponents={[
            {
              component: { default: Field },
              props: {
                name: 'discount_type',
                value: get(coupon, 'discount_type'),
                options: [
                  {
                    value: 'fixed_discount_to_entire_order',
                    text: 'Fixed discount to entire order'
                  },
                  {
                    value: 'percentage_discount_to_entire_order',
                    text: 'Percentage discount to entire order'
                  },
                  {
                    value: 'fixed_discount_to_specific_products',
                    text: 'Fixed discount to specific products'
                  },
                  {
                    value: 'percentage_discount_to_specific_products',
                    text: 'Percentage discount to specific products'
                  },
                  {
                    value: 'buy_x_get_y',
                    text: 'Buy X get Y'
                  }
                ],
                validationRules: ['notEmpty'],
                type: 'radio'
              },
              sortOrder: 10,
              id: 'couponDiscountType'
            }
          ]}
        />
      </div>
      <div className='mt-1'>
        <TargetProducts
          products={get(target_products, 'products', [])}
          maxQty={get(target_products, 'maxQty', '')}
          discountType={get(coupon, 'discount_type', '')}
        />
        <BuyXGetY
          requireProducts={buyx_gety}
          discountType={get(coupon, 'discount_type', '')}
        />
      </div>
    </div>
  );
}