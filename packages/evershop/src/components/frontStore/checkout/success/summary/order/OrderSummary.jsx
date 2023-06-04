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
  shippingMethodName,
  shippingFeeInclTax,
  taxAmount,
  discountAmount,
  grandTotal
}) {
  return (
    <div className="checkout-summary-block">
      <Subtotal count={items.length} total={subTotal.text} />
      <Shipping method={shippingMethodName} cost={shippingFeeInclTax.text} />
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
  shippingFeeInclTax: PropTypes.shape({
    text: PropTypes.string.isRequired
  }),
  shippingMethodName: PropTypes.string,
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
  shippingFeeInclTax: {
    text: '0.00'
  },
  shippingMethodName: 'Free Shipping',
  subTotal: {
    text: '0.00'
  },
  taxAmount: {
    text: '0.00'
  }
};

export { OrderSummary };
