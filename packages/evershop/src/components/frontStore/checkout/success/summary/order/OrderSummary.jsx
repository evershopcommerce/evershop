import PropTypes from 'prop-types';
import React from 'react';
import { Discount } from '@components/frontStore/checkout/success/summary/order/Discount';
import { Shipping } from '@components/frontStore/checkout/success/summary/order/Shipping';
import { Subtotal } from '@components/frontStore/checkout/success/summary/order/Subtotal';
import { Tax } from '@components/frontStore/checkout/success/summary/order/Tax';
import { Total } from '@components/frontStore/checkout/success/summary/order/Total';

function OrderSummary({
  items,
  subTotal,
  shippingMethod,
  shippingFeeExclTax,
  taxAmount,
  discountAmount,
  grandTotal
}) {
  return (
    <div className="checkout-summary-block">
      <Subtotal count={items.length} total={subTotal.text} />
      <Shipping method={shippingMethod} cost={shippingFeeExclTax.text} />
      <Tax taxClass="" amount={taxAmount.text} />
      <Discount code="" amount={discountAmount.text} />
      <Total total={grandTotal.text} />
    </div>
  );
}

OrderSummary.propTypes = {
  discountAmount: PropTypes.shape({
    text: PropTypes.string.isRequired
  }),
  grandTotal: PropTypes.shape({
    text: PropTypes.string.isRequired
  }),
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      quantity: PropTypes.number.isRequired,
      price: PropTypes.shape({
        text: PropTypes.string.isRequired
      }).isRequired
    })
  ).isRequired,
  shippingFeeExclTax: PropTypes.shape({
    text: PropTypes.string.isRequired
  }),
  shippingMethod: PropTypes.shape({
    text: PropTypes.string
  }),
  subTotal: PropTypes.shape({
    text: PropTypes.string
  }),
  taxAmount: PropTypes.shape({
    text: PropTypes.string
  })
};

OrderSummary.defaultProps = {
  discountAmount: {
    text: '0.00'
  },
  grandTotal: {
    text: '0.00'
  },
  shippingFeeExclTax: {
    text: '0.00'
  },
  shippingMethod: {
    text: 'Free Shipping'
  },
  subTotal: {
    text: '0.00'
  },
  taxAmount: {
    text: '0.00'
  }
};

export { OrderSummary };
