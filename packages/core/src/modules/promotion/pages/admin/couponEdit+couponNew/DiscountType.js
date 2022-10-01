import React from 'react';
import Area from '../../../../../lib/components/Area';
import { Field } from '../../../../../lib/components/form/Field';
import { get } from '../../../../../lib/util/get';
import { BuyXGetY } from '../../../components/BuyXGetY';
import { TargetProducts } from '../../../components/TargetProduct';

export default function DiscountType({ coupon = {} }) {
  const targetProducts = get(coupon, 'targetProducts', {});
  const buyxGety = get(coupon, 'buyxGety', []);

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
                value: get(coupon, 'discountType'),
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
              sortOrder: 10
            }
          ]}
        />
      </div>
      <div className='mt-1'>
        <TargetProducts
          products={get(targetProducts, 'products', [])}
          maxQty={get(targetProducts, 'maxQty', '')}
          discountType={get(coupon, 'discountType', '')}
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
}

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