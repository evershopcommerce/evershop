import { Card } from '@components/admin/Card';
import { Circle } from '@components/admin/Circle.js';
import Area from '@components/common/Area.js';
import PropTypes from 'prop-types';
import React from 'react';
import { Discount } from './payment/Discount.js';
import { Shipping } from './payment/Shipping.js';
import { SubTotal } from './payment/SubTotal.js';
import { Tax } from './payment/Tax.js';
import { Total } from './payment/Total.js';
import './Payment.scss';

export default function OrderSummary({
  order: {
    orderId,
    coupon,
    shippingMethodName,
    paymentMethodName,
    totalQty,
    totalTaxAmount,
    discountAmount,
    grandTotal,
    subTotal,
    shippingFeeInclTax,
    currency,
    paymentStatus
  }
}) {
  return (
    <Card
      title={
        <div className="flex space-x-2">
          <Circle variant={paymentStatus.badge} />
          <span className="block self-center">
            {`${paymentStatus.name || 'Unknown'} - ${
              paymentMethodName || 'Unknown'
            }`}
          </span>
        </div>
      }
    >
      <Card.Session>
        <Area
          id="orderSummaryBlock"
          orderId={orderId}
          currency={currency}
          grandTotal={grandTotal}
          coupon={coupon}
          discountAmount={discountAmount}
          totalTaxAmount={totalTaxAmount}
          className="summary-wrapper"
          coreComponents={[
            {
              component: { default: SubTotal },
              props: { count: totalQty, total: subTotal.text },
              sortOrder: 5
            },
            {
              component: { default: Shipping },
              props: {
                method: shippingMethodName,
                cost: shippingFeeInclTax.text
              },
              sortOrder: 10
            },
            {
              component: { default: Discount },
              props: { code: coupon, discount: discountAmount.text },
              sortOrder: 15
            },
            {
              component: { default: Tax },
              props: { taxClass: '', amount: totalTaxAmount.text },
              sortOrder: 20
            },

            {
              component: { default: Total },
              props: { total: grandTotal.text },
              sortOrder: 30
            }
          ]}
        />
      </Card.Session>
      <Area id="orderPaymentActions" />
    </Card>
  );
}

OrderSummary.propTypes = {
  order: PropTypes.shape({
    orderId: PropTypes.string.isRequired,
    totalQty: PropTypes.number.isRequired,
    coupon: PropTypes.string,
    shippingMethod: PropTypes.string,
    paymentMethodName: PropTypes.string,
    totalTaxAmount: PropTypes.shape({
      text: PropTypes.string.isRequired
    }).isRequired,
    discountAmount: PropTypes.shape({
      text: PropTypes.string.isRequired
    }).isRequired,
    grandTotal: PropTypes.shape({
      text: PropTypes.string.isRequired
    }).isRequired,
    shippingMethodName: PropTypes.string,
    subTotal: PropTypes.shape({
      text: PropTypes.string.isRequired
    }).isRequired,
    shippingFeeInclTax: PropTypes.shape({
      text: PropTypes.string.isRequired
    }).isRequired,
    currency: PropTypes.string.isRequired,
    paymentStatus: PropTypes.shape({
      code: PropTypes.string,
      badge: PropTypes.string,
      progress: PropTypes.string,
      name: PropTypes.string
    }).isRequired
  }).isRequired
};

export const layout = {
  areaId: 'leftSide',
  sortOrder: 20
};

export const query = `
  query Query {
    order(uuid: getContextValue("orderId")) {
      orderId
      totalQty
      coupon
      shippingMethodName
      paymentMethod
      paymentMethodName
      totalTaxAmount {
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
      shippingFeeInclTax {
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
`;
