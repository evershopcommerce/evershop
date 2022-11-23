import React from 'react';
import { AddressSummary } from '../../../../customer/pages/frontStore/address/AddressSummary';
import Button from '../../../../../lib/components/form/Button';

export default function CustomerInfo({ order: { orderNumber, customerFullName, customerEmail, paymentMethodName, shippingAddress, billingAddress } }) {
  return (
    <div className="checkout-success-customer-info">
      <h3 className="thank-you flex justify-start space-x-1">
        <div className="check flex justify-center self-center text-interactive">
          <svg style={{ width: '3rem', height: '3rem' }} xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="self-center">
          <span style={{ fontSize: '1.6rem', fontWeight: '300' }}>
            Order #
            {orderNumber}
          </span>
          <div>
            Thank you
            {customerFullName}
            !
          </div>
        </div>
      </h3>

      <div className="customer-info mt-3 mb-2">
        <div className="heading font-bold mb-2">Customer information</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="mb-2">
              <div className="mb-075">Contact information</div>
              <div className="text-textSubdued">{customerEmail}</div>
            </div>
            <div>
              <div className="mb-075">Shipping Address</div>
              <div className="text-textSubdued"><AddressSummary address={shippingAddress} /></div>
            </div>
          </div>
          <div>
            <div className="mb-2">
              <div className="mb-075">Payment Method</div>
              <div className="text-textSubdued">{paymentMethodName}</div>
            </div>
            <div>
              <div className="mb-075">Billing Address</div>
              <div className="text-textSubdued"><AddressSummary address={billingAddress} /></div>
            </div>
          </div>
        </div>
      </div>
      <Button url="/" title="CONTINUE SHOPPING" />
    </div>
  );
}

export const layout = {
  areaId: 'checkoutSuccessPageLeft',
  sortOrder: 10
}

export const query = `
  query Query {
    order (id: getContextValue('orderId')) {
      orderNumber
      customerFullName
      customerEmail
      paymentMethodName
      shippingAddress {
        fullName
        postcode
        telephone
        country {
          name
          code
        }
        province {
          name
          code
        }
        city
        address1
        address2
      }
      billingAddress {
        fullName
        postcode
        telephone
        country {
          name
          code
        }
        province {
          name
          code
        }
        city
        address1
        address2
      }
    }
  }
`