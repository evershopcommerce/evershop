import React from 'react';
import './Summary.scss';
import { CartSummaryItemsList } from '@components/frontStore/cart/CartSummaryItems.js';
import { DefaultCartSummary } from '@components/frontStore/cart/CartTotalSummary.js';
import { Order } from '@components/frontStore/customer/CustomerContext.jsx';

interface SummaryProps {
  order: Order;
  setting: {
    priceIncludingTax: boolean;
  };
}

export default function Summary({
  order,
  setting: { priceIncludingTax }
}: SummaryProps) {
  return (
    <div className="checkout__summary h-full hidden md:block">
      <CartSummaryItemsList
        items={order.items}
        loading={false}
        showPriceIncludingTax={priceIncludingTax}
      />
      <DefaultCartSummary
        loading={false}
        showPriceIncludingTax={priceIncludingTax}
        shippingCost={order.shippingFeeInclTax.text}
        subTotal={order.subTotal.text}
        total={order.grandTotal.text}
        shippingMethod={order.shippingMethodName}
        coupon={order.coupon || ''}
        discountAmount={order.discountAmount.text}
        taxAmount={order.totalTaxAmount.text}
      />
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
    setting {
      priceIncludingTax
    }
  }
`;
