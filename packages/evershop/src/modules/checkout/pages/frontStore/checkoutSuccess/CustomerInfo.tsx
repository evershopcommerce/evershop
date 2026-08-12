import { AddressSummary } from '@components/common/customer/address/AddressSummary.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Check } from 'lucide-react';
import React from 'react';

interface CustomerInfoProps {
  order: {
    orderNumber: string;
    customerFullName: string;
    customerEmail: string;
    paymentMethodName: string;
    noShippingRequired: boolean;
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
    } | null; // zero-total orders don't collect a billing address
  };
}

export default function CustomerInfo({
  order: {
    orderNumber,
    customerFullName,
    customerEmail,
    paymentMethodName,
    noShippingRequired,
    shippingAddress,
    billingAddress
  }
}: CustomerInfoProps) {
  return (
    <div className="checkout-success-customer-info">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
          <Check className="h-8 w-8" strokeWidth={2.5} />
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">
          {_('Thank you for your order!')}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {_('Order')}{' '}
          <span className="font-medium text-foreground">#{orderNumber}</span>{' '}
          {_('is confirmed. We’ve emailed a receipt to ${email}.', {
            email: customerEmail
          })}
        </p>
      </div>

      <div className="customer-info mt-8 rounded-lg border border-border p-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold">
              {_('Contact information')}
            </h3>
            <div className="text-sm text-muted-foreground">
              {customerFullName || billingAddress?.fullName}
            </div>
            <div className="text-sm text-muted-foreground">{customerEmail}</div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">
              {_('Shipping Address')}
            </h3>
            <div className="text-sm text-muted-foreground">
              {noShippingRequired ? (
                _('No shipping required')
              ) : (
                <AddressSummary address={shippingAddress} />
              )}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">
              {_('Payment Method')}
            </h3>
            <div className="text-sm text-muted-foreground">
              {paymentMethodName}
            </div>
          </div>
          {billingAddress && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">
                {_('Billing Address')}
              </h3>
              <div className="text-sm text-muted-foreground">
                <AddressSummary address={billingAddress} />
              </div>
            </div>
          )}
        </div>
      </div>
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
      noShippingRequired
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
