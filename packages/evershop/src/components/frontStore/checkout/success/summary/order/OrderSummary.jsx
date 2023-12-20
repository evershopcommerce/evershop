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
  subTotalInclTax,
  shippingMethodName,
  shippingFeeInclTax,
  taxAmount,
  discountAmount,
  coupon,
  grandTotal,
  displayCheckoutPriceIncludeTax
}) {
  return (
    <div className="checkout-summary-block">
      <Subtotal
        count={items.length}
        total={
          displayCheckoutPriceIncludeTax ? subTotalInclTax.text : subTotal.text
        }
      />
      <Shipping method={shippingMethodName} cost={shippingFeeInclTax.text} />
      {!displayCheckoutPriceIncludeTax && (
        <Tax taxClass="" amount={taxAmount.text} />
      )}
      <Discount code={coupon} discount={discountAmount.text} />
      <Total
        total={grandTotal.text}
        displayCheckoutPriceIncludeTax={displayCheckoutPriceIncludeTax}
        taxAmount={taxAmount.text}
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
  subTotalInclTax: PropTypes.shape({
    text: PropTypes.string
  }),
  taxAmount: PropTypes.shape({
    text: PropTypes.string
  }),
  displayCheckoutPriceIncludeTax: PropTypes.bool.isRequired
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
  taxAmount: {
    text: '0.00'
  }
};

export { OrderSummary };
