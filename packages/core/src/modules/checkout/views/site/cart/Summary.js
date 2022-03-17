import PropTypes from 'prop-types';
import React from 'react';
import Area from '../../../../../lib/components/Area';
import Button from '../../../../../lib/components/form/Button';
import { getComponents } from '../../../../../lib/components/getComponents';
import { useAppState } from '../../../../../lib/context/app';

const { get } = require('../../../../../lib/util/get');

function Subtotal({ subTotal }) {
  const currency = get(useAppState(), 'currency', 'USD');
  const language = get(useAppState(), 'language', 'en');
  const formatedSubTotal = new Intl.NumberFormat(language, { style: 'currency', currency }).format(subTotal);
  return (
    <div className="flex justify-end gap-3" style={{ fontSize: '2rem' }}>
      <div>Subtotal</div>
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

function Discount({ discountAmount }) {
  const currency = get(useAppState(), 'currency', 'USD');
  const language = get(useAppState(), 'language', 'en');
  const formatedDiscountAmount = new Intl.NumberFormat(language, { style: 'currency', currency }).format(discountAmount);

  if (!discountAmount) { return null; }
  return (
    <div className="flex justify-end gap-3">
      <div>Discount</div>
      <div className="text-right">{formatedDiscountAmount}</div>
    </div>
  );
}

Discount.propTypes = {
  discountAmount: PropTypes.number
};

Discount.defaultProps = {
  discountAmount: 0
};

function Summary({ checkoutUrl }) {
  const cart = get(useAppState(), 'cart', {});
  if (cart.items === undefined || cart.items.length === 0) { return null; }
  return (
    <div className="summary mt-3">
      <div className="flex justify-end flex-col">
        <Area
          id="shopping-cart-summary"
          noOuter
          cart={cart}
          components={getComponents()}
          coreComponents={[
            {
              component: { default: Subtotal },
              props: { subTotal: cart.sub_total },
              sortOrder: 10,
              id: 'shoppingCartSubtotal'
            },
            {
              component: { default: Discount },
              props: { discountAmount: cart.discount_amount },
              sortOrder: 20,
              id: 'shoppingCartDiscount'
            },
            {
              // eslint-disable-next-line react/no-unstable-nested-components
              component: { default: () => <div className="flex justify-end italic text-textSubdued">Taxes and shipping calculated at checkout</div> },
              props: {},
              sortOrder: 30,
              id: 'summaryNote'
            }
          ]}
        />
      </div>
      <div className="shopping-cart-checkout-btn flex justify-end mt-3">
        <Button url={checkoutUrl} title="CHECKOUT" variant="primary" />
      </div>
    </div>
  );
}

Summary.propTypes = {
  checkoutUrl: PropTypes.string.isRequired
};

export default Summary;
