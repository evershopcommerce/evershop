import React from 'react';
import './Summary.scss';
import { CartSummaryItemsList } from '@components/frontStore/CartSummaryItems.js';
import { DefaultCartSummary } from '@components/frontStore/CartTotalSummary.js';

interface SummaryProps {
  order: {
    items: Array<{
      uuid: string;
      productName: string;
      productSku: string;
      qty: number;
      productUrl: string;
      productPrice: {
        text: string;
      };
      productPriceInclTax: {
        text: string;
      };
      thumbnail: string;
      variantOptions?: {
        attributeCode: string;
        attributeName: string;
        attributeId: number;
        optionId: number;
        optionText: string;
      }[];
      lineTotalInclTax: {
        text: string;
      };
      lineTotal: {
        text: string;
      };
    }>;
    shippingMethodName: string;
    shippingFeeInclTax: {
      text: string;
    };
    shippingFeeExclTax: {
      text: string;
    };
    totalTaxAmount: {
      text: string;
    };
    discountAmount: {
      text: string;
    };
    coupon?: string;
    subTotal: {
      text: string;
    };
    subTotalInclTax: {
      text: string;
    };
    grandTotal: {
      text: string;
    };
  };
  setting: {
    priceIncludingTax: boolean;
  };
}
export default function Summary({
  order,
  setting: { priceIncludingTax }
}: SummaryProps) {
  const items = order.items.map((item) => ({
    id: item.uuid,
    name: item.productName,
    sku: item.productSku,
    qty: item.qty,
    url: item.productUrl,
    price: priceIncludingTax
      ? item.productPriceInclTax.text
      : item.productPrice.text,
    thumbnail: item.thumbnail,
    variantOptions: item.variantOptions || [],
    lineTotal: priceIncludingTax
      ? item.lineTotalInclTax.text
      : item.lineTotal.text,
    errors: []
  }));
  return (
    <div className="checkout-summary h-full hidden md:block">
      <CartSummaryItemsList items={items} loading={false} />
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
        variantOptions
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
