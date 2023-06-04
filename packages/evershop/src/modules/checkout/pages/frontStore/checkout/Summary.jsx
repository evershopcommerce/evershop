import PropTypes from 'prop-types';
import React from 'react';
import { Items } from '@components/frontStore/checkout/checkout/summary/Items';
import { CartSummary } from '@components/frontStore/checkout/checkout/summary/Cart';
import Area from '@components/common/Area';
import './Summary.scss';

export default function Summary({ cart }) {
  return (
    <Area
      id="checkoutSummary"
      className="checkout-summary hidden md:block"
      coreComponents={[
        {
          component: { default: Items },
          props: { items: cart.items },
          sortOrder: 20,
          id: 'checkoutOrderSummaryItems'
        },
        {
          component: { default: CartSummary },
          props: { ...cart },
          sortOrder: 30,
          id: 'checkoutOrderSummaryCart'
        }
      ]}
    />
  );
}

Summary.propTypes = {
  cart: PropTypes.shape({
    items: PropTypes.arrayOf(
      PropTypes.shape({
        thumbnail: PropTypes.string,
        productName: PropTypes.string,
        variantOptions: PropTypes.string,
        qty: PropTypes.number,
        total: PropTypes.shape({
          text: PropTypes.string
        })
      })
    ),
    totalQty: PropTypes.number,
    subTotal: PropTypes.shape({
      text: PropTypes.string
    }),
    grandTotal: PropTypes.shape({
      text: PropTypes.string
    }),
    discountAmount: PropTypes.shape({
      text: PropTypes.string
    }),
    taxAmount: PropTypes.shape({
      text: PropTypes.string
    }),
    shippingFeeInclTax: PropTypes.shape({
      text: PropTypes.string
    }),
    shippingMethodName: PropTypes.string,
    coupon: PropTypes.string
  }).isRequired
};

export const layout = {
  areaId: 'checkoutPageRight',
  sortOrder: 10
};

export const query = `
  query Query {
    cart {
      totalQty
      subTotal {
        value
        text
      }
      grandTotal {
        value
        text
      }
      discountAmount {
        value
        text
      }
      taxAmount {
        value
        text
      }
      shippingFeeInclTax {
        value
        text
      }
      shippingMethodName
      coupon
      items {
        thumbnail
        productName
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
`;
