import { AddressSummary } from '@components/common/customer/address/AddressSummary.js';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface CustomerProps {
  order: {
    customerFullName: string;
    customerEmail: string;
    customerUrl?: string;
    noShippingRequired: boolean;
    shippingAddress: {
      fullName: string;
      city: string;
      address1: string;
      address2?: string;
      postcode: string;
      telephone: string;
      province: {
        code: string;
        name: string;
      };
      country: {
        code: string;
        name: string;
      };
    };
    billingAddress: {
      fullName: string;
      city: string;
      address1: string;
      address2?: string;
      postcode: string;
      telephone: string;
      province: {
        code: string;
        name: string;
      };
      country: {
        code: string;
        name: string;
      };
    };
  };
}

export default function Customer({
  order: {
    noShippingRequired,
    shippingAddress,
    billingAddress,
    customerFullName,
    customerEmail,
    customerUrl
  }
}: CustomerProps) {
  return (
    <Card className="">
      <CardHeader>
        <CardTitle>{_('Customer Information')}</CardTitle>
      </CardHeader>
      <CardContent>
        {customerUrl && (
          <a
            href={customerUrl}
            className="text-interactive hover:underline block"
          >
            {customerFullName}
          </a>
        )}
        {!customerUrl && (
          <span>
            {customerEmail} {_('(Guest Checkout)')}
          </span>
        )}
      </CardContent>
      <CardContent className="border-t border-border pt-3">
        <CardTitle className="mb-2">{_('Contact Information')}</CardTitle>
        <div>
          <a href="#" className="text-interactive hover:underline">
            {customerEmail}
          </a>
        </div>
        {shippingAddress?.telephone && (
          <div>
            <span>{shippingAddress.telephone}</span>
          </div>
        )}
      </CardContent>
      <CardContent className="border-t border-border pt-3">
        <CardTitle className="mb-2">{_('Shipping Address')}</CardTitle>
        {!noShippingRequired && <AddressSummary address={shippingAddress} />}
        {noShippingRequired && (
          <span className="text-muted-foreground">
            {_('No shipping required')}
          </span>
        )}
      </CardContent>
      <CardContent className="border-t border-border pt-3">
        <CardTitle className="mb-2">{_('Billing address')}</CardTitle>
        <AddressSummary address={billingAddress} />
      </CardContent>
    </Card>
  );
}

export const layout = {
  areaId: 'rightSide',
  sortOrder: 15
};

export const query = `
  query Query {
    order(uuid: getContextValue("orderId")) {
      customerFullName
      customerEmail
      customerUrl
      noShippingRequired
      shippingAddress {
        fullName
        city
        address1
        address2
        postcode
        telephone
        province {
          code
          name
        }
        country {
          code
          name
        }
      }
      billingAddress {
        fullName
        city
        address1
        address2
        postcode
        telephone
        province {
          code
          name
        }
        country {
          code
          name
        }
      }
    }
  }
`;
