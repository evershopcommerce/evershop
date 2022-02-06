import React from 'react';
import { useAppState } from '../../../../../../lib/context/app';
import { get } from '../../../../../../lib/util/get';

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

function Discount({ discount, code }) {
  if (!discount) { return null; }

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

function Shipping({ method, cost }) {
  if (!method) { return null; }

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

function Tax({ taxClass, amount }) {
  return (
    <div className="summary-row">
      <span>Tax</span>
      <div>
        <div>{taxClass || 'No Tax'}</div>
        <div>{amount}</div>
      </div>
    </div>
  );
}

function Total({ total }) {
  return (
    <div className="summary-row grand-total">
      <span className="self-center font-bold">Total</span>
      <div>
        <div />
        <div className="grand-total-value">{total}</div>
      </div>
    </div>
  );
}

function OrderSummary() {
  const context = useAppState();
  const { order } = context;
  const { items } = order;
  const language = get(context, 'shop.language', 'en');
  const currency = get(context, 'shop.currency', 'usd');

  const _shippingCost = new Intl.NumberFormat(language, { style: 'currency', currency }).format(order.shipping_fee_excl_tax);
  const _taxAmount = new Intl.NumberFormat(language, { style: 'currency', currency }).format(order.tax_amount);
  const _discountAmount = new Intl.NumberFormat(language, { style: 'currency', currency }).format(order.discount_amount);
  const _subTotal = new Intl.NumberFormat(language, { style: 'currency', currency }).format(order.sub_total);
  const _grandTotal = new Intl.NumberFormat(language, { style: 'currency', currency }).format(order.grand_total);

  return (
    <div className="checkout-summary-block">
      <Subtotal count={items.length} total={_subTotal} />
      <Shipping method={order.shipping_method} cost={_shippingCost} />
      <Tax taxClass="" amount={_taxAmount} />
      <Discount code="" amount={_discountAmount} />
      <Total total={_grandTotal} />
    </div>
  );
}

export { OrderSummary };
