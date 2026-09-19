import React from 'react';
import './Summary.scss';
import { useAppState } from '@components/common/context/app.js';
import { OrderSummaryItems } from '@components/frontStore/checkout/OrderSummaryItems.js';
import { OrderTotalSummary } from '@components/frontStore/checkout/OrderTotalSummary.js';
import { Order } from '@components/frontStore/customer/CustomerContext.jsx';
import { _ } from '@evershop/evershop/lib/locale/translate/_';

interface SummaryProps {
  order: Order;
}

export default function Summary({ order }: SummaryProps) {
  const {
    config: {
      tax: { priceIncludingTax }
    }
  } = useAppState();
  return (
    <div className="checkout__summary mt-8 rounded-lg border border-border p-6">
      <h2 className="mb-4 h4">{_('Order summary')}</h2>
      <OrderSummaryItems items={order.items} />
      <div className="mt-4">
        <OrderTotalSummary
          shippingCost={
            priceIncludingTax
              ? order.shippingFeeInclTax.text
              : order.shippingFeeExclTax.text
          }
          subTotal={
            priceIncludingTax ? order.subTotalInclTax.text : order.subTotal.text
          }
          total={order.grandTotal.text}
          shippingMethod={order.shippingMethodName}
          coupon={order.coupon || ''}
          discountAmount={order.discountAmount.text}
          taxAmount={order.totalTaxAmount.text}
        />
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'checkoutSuccessPageRight',
  sortOrder: 10
};

export const query = `
  query Query {
    order (uuid: getContextValue('orderId')) {
      orderNumber
      discountAmount {
        text
      }
      coupon
      shippingMethodName
      shippingFeeInclTax {
        text
      }
      shippingFeeExclTax {
        text
      }
      totalTaxAmount {
        text
      }
      subTotal {
        text
      }
      subTotalInclTax {
        text
      }
      grandTotal {
        text
      }
      items {
        uuid
        productName
        thumbnail
        productSku
        qty
        productUrl
        productPrice {
          text
        }
        productPriceInclTax {
          text
        }
        variantOptions {
          attributeCode
          attributeName
          attributeId
          optionId
          optionText
        }
        lineTotalInclTax {
          text
        }
        lineTotal {
          text
        }
      }
    }
  }
`;
