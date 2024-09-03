import PropTypes from 'prop-types';
import React from 'react';
import { Items } from '@components/frontStore/checkout/checkout/summary/Items';
import { CartSummary } from '@components/frontStore/checkout/checkout/summary/Cart';
import Area from '@components/common/Area';
import './SummaryMobile.scss';

export default function Summary({ cart, setting: { priceIncludingTax } }) {
  return (
    <Area
      id="checkoutSummary"
      className="checkout-summary checkout__summary__mobile md:hidden divide-y border rounded border-divider px-8 mb-8"
      coreComponents={[
        {
          component: { default: Items },
          props: { items: cart.items, priceIncludingTax },
          sortOrder: 20,
          id: 'checkoutOrderSummaryItems'
        },
        {
          component: { default: CartSummary },
          props: { ...cart, priceIncludingTax },
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
        lineTotalInclTax: PropTypes.shape({
          text: PropTypes.string
        }),
        lineTotal: PropTypes.shape({
          text: PropTypes.string
        })
      })
    ),
    totalQty: PropTypes.number,
    subTotal: PropTypes.shape({
      text: PropTypes.string
    }),
    subTotalInclTax: PropTypes.shape({
      text: PropTypes.string
    }),
    grandTotal: PropTypes.shape({
      text: PropTypes.string
    }),
    discountAmount: PropTypes.shape({
      text: PropTypes.string
    }),
    totalTaxAmount: PropTypes.shape({
      text: PropTypes.string
    }),
    shippingFeeInclTax: PropTypes.shape({
      text: PropTypes.string
    }),
    shippingMethodName: PropTypes.string,
    coupon: PropTypes.string
  }).isRequired,
  setting: PropTypes.shape({
    priceIncludingTax: PropTypes.bool
  }).isRequired
};

export const layout = {
  areaId: 'beforePlaceOrderButton',
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
      subTotalInclTax {
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
      totalTaxAmount {
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
