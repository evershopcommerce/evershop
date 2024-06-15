import PropTypes from 'prop-types';
import React from 'react';
import { Items } from '@components/frontStore/checkout/checkout/summary/Items';
import { CartSummary } from '@components/frontStore/checkout/checkout/summary/Cart';
import Area from '@components/common/Area';
import './SummaryMobile.scss';

export default function Summary({
  cart,
  setting: { displayCheckoutPriceIncludeTax }
}) {
  return (
    <Area
      id="checkoutSummary"
      className="checkout-summary checkout__summary__mobile md:hidden divide-y border rounded border-divider px-8 mb-8"
      coreComponents={[
        {
          component: { default: Items },
          props: { items: cart.items, displayCheckoutPriceIncludeTax },
          sortOrder: 20,
          id: 'checkoutOrderSummaryItems'
        },
        {
          component: { default: CartSummary },
          props: { ...cart, displayCheckoutPriceIncludeTax },
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
        }),
        subTotal: PropTypes.shape({
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
    taxAmount: PropTypes.shape({
      text: PropTypes.string
    }),
    shippingFeeInclTax: PropTypes.shape({
      text: PropTypes.string
    }),
    shippingMethodName: PropTypes.string,
    coupon: PropTypes.string
  }).isRequired,
  setting: PropTypes.shape({
    displayCheckoutPriceIncludeTax: PropTypes.bool
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
