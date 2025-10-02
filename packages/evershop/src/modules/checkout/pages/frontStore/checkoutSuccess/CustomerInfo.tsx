import Button from '@components/common/Button.js';
import { AddressSummary } from '@components/common/customer/address/AddressSummary.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface CustomerInfoProps {
  order: {
    orderNumber: string;
    customerFullName: string;
    customerEmail: string;
    paymentMethodName: string;
    shippingAddress: {
      fullName: string;
      postcode: string;
      telephone: string;
      country: {
        name: string;
        code: string;
      };
      province: {
        name: string;
        code: string;
      };
      city: string;
      address1: string;
      address2: string;
    };
    billingAddress: {
      fullName: string;
      postcode: string;
      telephone: string;
      country: {
        name: string;
        code: string;
      };
      province: {
        name: string;
        code: string;
      };
      city: string;
      address1: string;
      address2: string;
    };
  };
}

export default function CustomerInfo({
  order: {
    orderNumber,
    customerFullName,
    customerEmail,
    paymentMethodName,
    shippingAddress,
    billingAddress
  }
}: CustomerInfoProps) {
  return (
    <div className="checkout-success-customer-info">
      <h3 className="thank-you flex justify-start space-x-5">
        <div className="check flex justify-center self-center text-interactive">
          <svg
            style={{ width: '3rem', height: '3rem' }}
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <div className="self-center">
          <span style={{ fontSize: '1.6rem', fontWeight: '300' }}>
            {_('Order #${orderNumber}', { orderNumber })}
          </span>
          <div>
            {_('Thank you ${name}!', {
              name: customerFullName || billingAddress?.fullName
            })}
          </div>
        </div>
      </h3>

      <div className="customer-info mt-7 mb-5">
        <div className="grid grid-cols-2 gap-7">
          <div>
            <div className="mb-2">
              <h3>{_('Contact information')}</h3>
            </div>
            <div className="text-textSubdued">
              {customerFullName || billingAddress?.fullName}
            </div>
            <div className="text-textSubdued">{customerEmail}</div>
          </div>
          <div>
            <div className="mb-2">
              <h3>{_('Shipping Address')}</h3>
            </div>
            <div className="text-textSubdued">
              <AddressSummary address={shippingAddress} />
            </div>
          </div>
          <div>
            <div className="mb-2">
              <h3>{_('Payment Method')}</h3>
            </div>
            <div className="text-textSubdued">{paymentMethodName}</div>
          </div>
          <div>
            <div className="mb-2">
              <h3>{_('Billing Address')}</h3>
            </div>
            <div className="text-textSubdued">
              <AddressSummary address={billingAddress} />
            </div>
          </div>
        </div>
      </div>
      <Button url="/" title={_('CONTINUE SHOPPING')} />
    </div>
  );
}

export const layout = {
  areaId: 'checkoutSuccessPageLeft',
  sortOrder: 10
};

export const query = `
  query Query {
    order (uuid: getContextValue('orderId')) {
      orderNumber
      customerFullName
      customerEmail
      paymentMethodName
      shippingNote
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
`;
