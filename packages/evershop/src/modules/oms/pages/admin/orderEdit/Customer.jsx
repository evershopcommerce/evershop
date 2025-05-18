import { Card } from '@components/admin/cms/Card';
import { AddressSummary } from '@components/common/customer/address/AddressSummary';
import PropTypes from 'prop-types';
import React from 'react';

export default function Customer({
  order: {
    shippingAddress,
    billingAddress,
    customerFullName,
    customerEmail,
    customerUrl
  }
}) {
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
        <div>
          <span>{shippingAddress.telephone}</span>
        </div>
      </Card.Session>
      <Card.Session title="Shipping Address">
        <AddressSummary address={shippingAddress} />
      </Card.Session>
      <Card.Session title="Billing address">
        <AddressSummary address={billingAddress} />
      </Card.Session>
    </Card>
  );
}

Customer.propTypes = {
  order: PropTypes.shape({
    customerFullName: PropTypes.string.isRequired,
    customerEmail: PropTypes.string.isRequired,
    customerUrl: PropTypes.string,
    shippingAddress: PropTypes.shape({
      fullName: PropTypes.string.isRequired,
      address1: PropTypes.string.isRequired,
      city: PropTypes.string.isRequired,
      postcode: PropTypes.string.isRequired,
      telephone: PropTypes.string.isRequired,
      province: PropTypes.shape({
        code: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired
      }).isRequired,
      country: PropTypes.shape({
        code: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired
      }).isRequired
    }).isRequired,
    billingAddress: PropTypes.shape({
      fullName: PropTypes.string.isRequired,
      address1: PropTypes.string.isRequired,
      city: PropTypes.string.isRequired,
      postcode: PropTypes.string.isRequired,
      telephone: PropTypes.string.isRequired,
      province: PropTypes.shape({
        code: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired
      }).isRequired,
      country: PropTypes.shape({
        code: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired
      }).isRequired
    }).isRequired
  }).isRequired
};

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
