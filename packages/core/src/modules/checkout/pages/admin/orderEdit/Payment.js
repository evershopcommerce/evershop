import PropTypes from 'prop-types';
import React from 'react';
import Area from '../../../../../lib/components/Area';
import Circle from '../../../../../lib/components/Circle';
import { Card } from '../../../../cms/components/admin/Card';
import './Payment.scss';

function Subtotal({ count, total }) {
  return (
    <div className="summary-row">
      <span>Subtotal</span>
      <div>
        <div>
          {count}
          {' '}
          items
        </div>
        <div>{total}</div>
      </div>
    </div>
  );
}

Subtotal.propTypes = {
  count: PropTypes.number.isRequired,
  total: PropTypes.string.isRequired
};

function Discount({ discount, code }) {
  return (
    <div className="summary-row">
      <span>Discount</span>
      <div>
        <div>{code}</div>
        <div>{discount}</div>
      </div>
    </div>
  );
}

Discount.propTypes = {
  code: PropTypes.string,
  discount: PropTypes.number
};

Discount.defaultProps = {
  code: undefined,
  discount: 0
};

function Shipping({ method, cost }) {
  return (
    <div className="summary-row">
      <span>Shipping</span>
      <div>
        <div>{method}</div>
        <div>{cost}</div>
      </div>
    </div>
  );
}

Shipping.propTypes = {
  cost: PropTypes.string.isRequired,
  method: PropTypes.string.isRequired
};

function Tax({ taxClass, amount }) {
  return (
    <div className="summary-row">
      <span>Tax</span>
      <div>
        <div>{taxClass}</div>
        <div>{amount}</div>
      </div>
    </div>
  );
}

Tax.propTypes = {
  amount: PropTypes.string.isRequired,
  taxClass: PropTypes.string.isRequired
};

function Total({ total }) {
  return (
    <div className="summary-row">
      <span>Total</span>
      <div>
        <div>{total}</div>
      </div>
    </div>
  );
}

Total.propTypes = {
  total: PropTypes.string.isRequired
};

export default function OrderSummary({ order: { orderId, coupon, shippingMethod, totalQty, taxAmount, discountAmount, grandTotal, subTotal, shippingFeeExclTax, currency, paymentStatus } }) {
  return (
    <Card title={(
      <div className="flex space-x-1">
        <Circle variant={paymentStatus.badge} />
        <span className="block self-center">{paymentStatus.name || 'Unknown'}</span>
      </div>
    )}
    >
      <Card.Session>
        <Area
          id="orderSummaryBlock"
          orderId={orderId}
          currency={currency}
          grandTotal={grandTotal}
          coupon={coupon}
          discountAmount={discountAmount}
          taxAmount={taxAmount}
          className="summary-wrapper"
          coreComponents={[
            {
              component: { default: Subtotal },
              props: { count: totalQty, total: subTotal.text },
              sortOrder: 5,
              id: 'summary_subtotal'
            },
            {
              component: { default: Shipping },
              props: { method: shippingMethod, cost: shippingFeeExclTax.text },
              'sortOrder ': 10,
              id: 'summary_shipping'
            },
            {
              component: { default: Discount },
              ps: { code: coupon, discount: discountAmount.text },
              'sortOrder ': 10,
              id: 'summary_discount'
            },
            {
              component: { default: Tax },
              props: { taxClass: '', amount: taxAmount.text },
              'sortOrder ': 20,
              id: 'summary_tax'
            },

            {
              component: { default: Total },
              props: { total: grandTotal.text },
              sortOrder: 30,
              id: 'summary_grand_total'
            }
          ]}
        />
      </Card.Session>
      <Card.Session>
        <div className="flex justify-between">
          <div className="self-center">
            <span>Paid by customer</span>
          </div>
          <div className="self-center">
            <span>{grandTotal.text}</span>
          </div>
        </div>
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 20
}

export const query = `
  query Query {
    order(id: getContextValue("orderId")) {
      orderId
      totalQty
      coupon
      shippingMethod
      taxAmount {
        text(currency: getContextValue("orderCurrency"))
      }
      discountAmount {
        text(currency: getContextValue("orderCurrency"))
      }
      grandTotal {
        text(currency: getContextValue("orderCurrency"))
      }
      subTotal {
        text(currency: getContextValue("orderCurrency"))
      }
      shippingFeeExclTax {
        text(currency: getContextValue("orderCurrency"))
      }
      currency
      paymentStatus {
        code
        badge
        progress
        name
      }
    }
  }
`