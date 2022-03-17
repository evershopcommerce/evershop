import PropTypes from 'prop-types';
import React from 'react';
import Area from '../../../../../../lib/components/Area';
import Circle from '../../../../../../lib/components/Circle';
import { getComponents } from '../../../../../../lib/components/getComponents';
import { useAppState } from '../../../../../../lib/context/app';
import { get } from '../../../../../../lib/util/get';
import { Card } from '../../../../../cms/views/admin/Card';

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

export default function OrderSummary() {
  const context = useAppState();
  const order = get(context, 'order', {});
  const language = get(context, 'shop.language', 'en');

  const formatedshippingCost = new Intl.NumberFormat(language, { style: 'currency', currency: order.currency }).format(order.shipping_fee_excl_tax);
  const formatedtaxAmount = new Intl.NumberFormat(language, { style: 'currency', currency: order.currency }).format(order.tax_amount);
  const formateddiscountAmount = new Intl.NumberFormat(language, { style: 'currency', currency: order.currency }).format(order.discount_amount);
  const formatedsubTotal = new Intl.NumberFormat(language, { style: 'currency', currency: order.currency }).format(order.sub_total);
  const formatedgrandTotal = new Intl.NumberFormat(language, { style: 'currency', currency: order.currency }).format(order.grand_total);

  const statuses = get(context, 'paymentStatus', []);
  const status = statuses.find((s) => s.code === order.payment_status);
  return (
    <Card title={(
      <div className="flex space-x-1">
        <Circle variant={status.badge} />
        <span className="block self-center">{status.name}</span>
      </div>
    )}
    >
      <Card.Session>
        <Area
          id="orderSummaryBlock"
          orderId={order.order_id}
          currency={order.currency}
          grandTotal={order.grand_total}
          coupon={order.coupon}
          discountAmount={order.discount_amount}
          taxAmount={order.tax_amount}
          className="summary-wrapper"
          components={getComponents()}
          coreComponents={[
            {
              component: { default: Subtotal },
              props: { count: order.items.length, total: formatedsubTotal },
              sortOrder: 5,
              id: 'summary_subtotal'
            },
            {
              component: { default: Shipping },
              props: { method: order.shipping_method, cost: formatedshippingCost },
              'sortOrder ': 10,
              id: 'summary_shipping'
            },
            {
              component: { default: Discount },
              ps: { code: order.coupon, discount: formateddiscountAmount },
              'sortOrder ': 10,
              id: 'summary_discount'
            },
            {
              component: { default: Tax },
              props: { taxClass: '', amount: formatedtaxAmount },
              'sortOrder ': 20,
              id: 'summary_tax'
            },

            {
              component: { default: Total },
              props: { total: formatedgrandTotal },
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
            <span>{formatedgrandTotal}</span>
          </div>
        </div>
      </Card.Session>
    </Card>
  );
}
