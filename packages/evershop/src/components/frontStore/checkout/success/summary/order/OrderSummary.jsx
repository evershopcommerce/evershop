import { Discount } from '@components/frontStore/checkout/success/summary/order/Discount';
import { Shipping } from '@components/frontStore/checkout/success/summary/order/Shipping';
import { Subtotal } from '@components/frontStore/checkout/success/summary/order/Subtotal';
import { Tax } from '@components/frontStore/checkout/success/summary/order/Tax';
import { Total } from '@components/frontStore/checkout/success/summary/order/Total';
import PropTypes from 'prop-types';
import React from 'react';

function OrderSummary({
  items,
  subTotal,
  subTotalInclTax,
  shippingMethodName,
  shippingFeeInclTax,
  totalTaxAmount,
  discountAmount,
  coupon,
  grandTotal,
  priceIncludingTax
}) {
  return (
    <div className="checkout-summary-block">
      <Subtotal
        count={items.length}
        total={priceIncludingTax ? subTotalInclTax.text : subTotal.text}
      />
      <Shipping method={shippingMethodName} cost={shippingFeeInclTax.text} />
      {!priceIncludingTax && <Tax taxClass="" amount={totalTaxAmount.text} />}
      <Discount code={coupon} discount={discountAmount.text} />
      <Total
        total={grandTotal.text}
        priceIncludingTax={priceIncludingTax}
        totalTaxAmount={totalTaxAmount.text}
      />
    </div>
  );
}

OrderSummary.propTypes = {
  coupon: PropTypes.string,
  discountAmount: PropTypes.shape({
    text: PropTypes.string.isRequired
  }),
  grandTotal: PropTypes.shape({
    text: PropTypes.string.isRequired
  }),
  items: PropTypes.arrayOf(
    PropTypes.shape({
      productName: PropTypes.string.isRequired,
      qty: PropTypes.number.isRequired,
      lineTotalInclTax: PropTypes.shape({
        text: PropTypes.string.isRequired
      }).isRequired,
      lineTotal: PropTypes.shape({
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
  subTotalInclTax: PropTypes.shape({
    text: PropTypes.string
  }),
  totalTaxAmount: PropTypes.shape({
    text: PropTypes.string
  }),
  priceIncludingTax: PropTypes.bool.isRequired
};

OrderSummary.defaultProps = {
  coupon: '',
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
  subTotalInclTax: {
    text: '0.00'
  },
  totalTaxAmount: {
    text: '0.00'
  }
};

export { OrderSummary };
