import Area from '@components/common/Area';
import { Items } from '@components/frontStore/checkout/success/summary/items/Items';
import { OrderSummary } from '@components/frontStore/checkout/success/summary/order/OrderSummary';
import PropTypes from 'prop-types';
import React from 'react';
import './Summary.scss';

export default function Summary({ order, setting: { priceIncludingTax } }) {
  return (
    <Area
      id="checkoutSuccessSummary"
      className="checkout-summary h-full hidden md:block"
      coreComponents={[
        {
          component: { default: Items },
          props: { items: order.items, priceIncludingTax },
          sortOrder: 20,
          id: 'checkoutSuccessOrderSummaryItems'
        },
        {
          component: { default: OrderSummary },
          props: { ...order, priceIncludingTax },
          sortOrder: 30,
          id: 'checkoutSuccessOrderSummary'
        }
      ]}
    />
  );
}

Summary.propTypes = {
  order: PropTypes.shape({
    items: PropTypes.arrayOf(
      PropTypes.shape({
        productName: PropTypes.string.isRequired,
        qty: PropTypes.number.isRequired,
        thumbnail: PropTypes.string,
        variantOptions: PropTypes.string,
        lineTotalInclTax: PropTypes.shape({
          text: PropTypes.string.isRequired
        }).isRequired,
        lineTotal: PropTypes.shape({
          text: PropTypes.string.isRequired
        }).isRequired
      })
    ).isRequired,
    discountAmount: PropTypes.shape({
      text: PropTypes.string.isRequired
    }),
    grandTotal: PropTypes.shape({
      text: PropTypes.string.isRequired
    }),
    shippingFeeInclTax: PropTypes.shape({
      text: PropTypes.string.isRequired
    }),
    shippingMethodName: PropTypes.string,
    subTotal: PropTypes.shape({
      text: PropTypes.string
    }),
    subTotalInclTax: PropTypes.shape({
      text: PropTypes.string
    }),
    totalTaxAmount: PropTypes.shape({
      text: PropTypes.string
    }),
    coupon: PropTypes.string
  }).isRequired,
  setting: PropTypes.shape({
    priceIncludingTax: PropTypes.bool
  }).isRequired
};

export const layout = {
  areaId: 'checkoutSuccessPageRight',
  sortOrder: 10
};

export const query = `
  query Query {
    order (uuid: getContextValue('orderId')) {
      orderNumber
      discountAmount {
        value
        text
      }
      coupon
      shippingMethodName
      shippingFeeInclTax {
        value
        text
      }
      totalTaxAmount {
        value
        text
      }
      subTotal {
        value
        text
      }
      subTotalInclTax {
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
        lineTotalInclTax {
          value
          text
        }
        lineTotal {
          value
          text
        }
      }
    }
    setting {
      priceIncludingTax
    }
  }
`;
