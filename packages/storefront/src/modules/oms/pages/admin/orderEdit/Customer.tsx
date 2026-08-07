import { Card } from '@components/admin/Card.js';
import { AddressSummary } from '@components/common/customer/address/AddressSummary.js';
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
    <Card title="Customer">
      <Card.Session>
        {customerUrl && (
          <a
            href={customerUrl}
            className="text-interactive hover:underline block"
          >
            {customerFullName}
          </a>
        )}
        {!customerUrl && <span>{customerEmail} (Guest Checkout)</span>}
      </Card.Session>
      <Card.Session title="Contact information">
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
      </Card.Session>
      <Card.Session title="Shipping Address">
        {!noShippingRequired && <AddressSummary address={shippingAddress} />}
        {noShippingRequired && <span>{'No shipping required'}</span>}
      </Card.Session>
      <Card.Session title="Billing address">
        <AddressSummary address={billingAddress} />
      </Card.Session>
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
