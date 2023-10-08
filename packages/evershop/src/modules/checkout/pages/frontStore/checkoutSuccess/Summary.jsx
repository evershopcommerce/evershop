import PropTypes from 'prop-types';
import React from 'react';
import { Items } from '@components/frontStore/checkout/success/summary/items/Items';
import Area from '@components/common/Area';
import { OrderSummary } from '@components/frontStore/checkout/success/summary/order/OrderSummary';
import './Summary.scss';

export default function Summary({
  order,
  setting: { displayCheckoutPriceIncludeTax }
}) {
  return (
    <Area
      id="checkoutSuccessSummary"
      className="checkout-summary hidden md:block"
      coreComponents={[
        {
          component: { default: Items },
          props: { items: order.items, displayCheckoutPriceIncludeTax },
          sortOrder: 20,
          id: 'checkoutSuccessOrderSummaryItems'
        },
        {
          component: { default: OrderSummary },
          props: { ...order, displayCheckoutPriceIncludeTax },
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
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        quantity: PropTypes.number.isRequired,
        price: PropTypes.shape({
          text: PropTypes.string.isRequired
        }).isRequired,
        thumbnail: PropTypes.string.isRequired,
        variantOptions: PropTypes.string.isRequired,
        total: PropTypes.shape({
          text: PropTypes.string.isRequired
        }).isRequired,
        subTotal: PropTypes.shape({
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
    taxAmount: PropTypes.shape({
      text: PropTypes.string
    }),
    coupon: PropTypes.string
  }).isRequired,
  setting: PropTypes.shape({
    displayCheckoutPriceIncludeTax: PropTypes.bool
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
      taxAmount {
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
        total {
          value
          text
        }
        subTotal {
          value
          text
        }
      }
    }
    setting {
      displayCheckoutPriceIncludeTax
    }
  }
`;
