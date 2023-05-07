import PropTypes from 'prop-types';
import React from 'react';
import Area from '@components/common/Area';
import Button from '@components/common/form/Button';
import { _ } from '@evershop/evershop/src/lib/locale/translate';

function Subtotal({ subTotal }) {
  return (
    <div className="flex justify-between gap-3">
      <div>{_('Sub total')}</div>
      <div className="text-right">{subTotal.text}</div>
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
  if (!coupon) {
    return null;
  }
  return (
    <div className="flex justify-between gap-3">
      <div>{_('Discount(${coupon})', { coupon })}</div>
      <div className="text-right">{discountAmount.text}</div>
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

function Summary({
  checkoutUrl,
  cart: { totalQty, subTotal, coupon, discountAmount }
}) {
  if (totalQty === undefined || totalQty <= 0) {
    return null;
  }
  return (
    <div className="summary">
      <div className="grid grid-cols-1 gap-2">
        <h4>{_('Order summary')}</h4>
        <Area
          id="shoppingCartSummary"
          noOuter
          coreComponents={[
            {
              component: { default: Subtotal },
              props: { subTotal },
              sortOrder: 10,
              id: 'shoppingCartSubtotal'
            },
            {
              component: { default: Discount },
              props: { discountAmount, coupon },
              sortOrder: 20,
              id: 'shoppingCartDiscount'
            },
            {
              // eslint-disable-next-line react/no-unstable-nested-components
              component: {
                default: () => (
                  <div className="flex justify-between italic text-textSubdued">
                    {_('Taxes and shipping calculated at checkout')}
                  </div>
                )
              },
              props: {},
              sortOrder: 30,
              id: 'summaryNote'
            }
          ]}
        />
      </div>
      <div className="shopping-cart-checkout-btn flex justify-between mt-2">
        <Button url={checkoutUrl} title={_('CHECKOUT')} variant="primary" />
      </div>
    </div>
  );
}

Summary.propTypes = {
  checkoutUrl: PropTypes.string.isRequired,
  cart: PropTypes.shape({
    totalQty: PropTypes.number,
    subTotal: PropTypes.shape({
      value: PropTypes.number,
      text: PropTypes.string
    }),
    discountAmount: PropTypes.shape({
      value: PropTypes.number,
      text: PropTypes.string
    }),
    coupon: PropTypes.string
  }).isRequired
};

export default Summary;

export const layout = {
  areaId: 'shoppingCartRight',
  sortOrder: 10
};

export const query = `
  query Query {
    cart(id: getContextValue('cartId', null)) {
      totalQty
      subTotal {
        value
        text
      }
      discountAmount {
        value
        text
      }
      coupon
    }
    checkoutUrl: url(routeId: "checkout")
  }
`;
