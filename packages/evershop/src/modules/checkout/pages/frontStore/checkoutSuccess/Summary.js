import React from 'react';
import { Items } from './summary/items/Items';
import Area from '../../../../../lib/components/Area';
import { OrderSummary } from './summary/order/OrderSummary';
import './Summary.scss';

export default function Summary({ order }) {
  return (
    <Area
      id="checkoutSuccessSummary"
      className="checkout-summary hidden md:block"
      coreComponents={[
        {
          component: { default: Items },
          props: { items: order.items },
          sortOrder: 20,
          id: 'checkoutSuccessOrderSummaryItems'
        },
        {
          component: { default: OrderSummary },
          props: { ...order },
          sortOrder: 30,
          id: 'checkoutSuccessOrderSummary'
        }
      ]}
    />
  );
}

export const layout = {
  areaId: 'checkoutSuccessPageRight',
  sortOrder: 10
}

export const query = `
  query Query {
    order (id: getContextValue('orderId')) {
      orderNumber
      discountAmount {
        value
        text
      }
      coupon
      shippingMethod
      shippingFeeExclTax {
        value
        text
      }
      taxAmount {
        value
        text
      }
      subTotal {
        value
        text
      }
      grandTotal {
        value
        text
      }
      items {
        productName
        thumbnail
        productSku
        qty
        variantOptions
        total {
          value
          text
        }
      }
    }
  }
`