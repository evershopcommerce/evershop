import PropTypes from 'prop-types';
import React from 'react';
import Area from '../../../../../lib/components/Area';
import Button from '../../../../../lib/components/form/Button';
import { useAppState } from '../../../../../lib/context/app';

const { get } = require('../../../../../lib/util/get');

function Subtotal({ subTotal }) {
  const currency = get(useAppState(), 'currency', 'USD');
  const language = get(useAppState(), 'language', 'en');
  const formatedSubTotal = new Intl.NumberFormat(language, { style: 'currency', currency }).format(subTotal);
  return (
    <div className="flex justify-between gap-3">
      <div>Sub total</div>
      <div className="text-right">{formatedSubTotal}</div>
    </div>
  );
}

Subtotal.propTypes = {
  subTotal: PropTypes.number
};

Subtotal.defaultProps = {
  subTotal: 0
};

function Discount({ discountAmount, coupon }) {
  const currency = get(useAppState(), 'currency', 'USD');
  const language = get(useAppState(), 'language', 'en');
  const formatedDiscountAmount = new Intl.NumberFormat(language, { style: 'currency', currency }).format(discountAmount);

  if (!discountAmount) { return null; }
  return (
    <div className="flex justify-between gap-3">
      <div>{`Discount(${coupon})`}</div>
      <div className="text-right">{formatedDiscountAmount}</div>
    </div>
  );
}

Discount.propTypes = {
  discountAmount: PropTypes.number,
  coupon: PropTypes.string
};

Discount.defaultProps = {
  discountAmount: 0,
  coupon: ''
};

function Summary({ checkoutUrl }) {
  const cart = get(useAppState(), 'cart', {});
  if (cart.items === undefined || cart.items.length === 0) { return null; }
  return (
    <div className="summary">
      <div className="grid grid-cols-1 gap-2">
        <h4>Order summary</h4>
        <Area
          id="shoppingCartSummary"
          noOuter
          cart={cart}
          coreComponents={[
            {
              component: { default: Subtotal },
              props: { subTotal: cart.sub_total },
              sortOrder: 10,
              id: 'shoppingCartSubtotal'
            },
            {
              component: { default: Discount },
              props: { discountAmount: cart.discount_amount, coupon: cart.coupon },
              sortOrder: 20,
              id: 'shoppingCartDiscount'
            },
            {
              // eslint-disable-next-line react/no-unstable-nested-components
              component: { default: () => <div className="flex justify-between italic text-textSubdued">Taxes and shipping calculated at checkout</div> },
              props: {},
              sortOrder: 30,
              id: 'summaryNote'
            }
          ]}
        />
      </div>
      <div className="shopping-cart-checkout-btn flex justify-between mt-2">
        <Button url={checkoutUrl} title="CHECKOUT" variant="primary" />
      </div>
    </div>
  );
}

Summary.propTypes = {
  checkoutUrl: PropTypes.string.isRequired
};

export default Summary;
