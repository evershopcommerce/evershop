import PropTypes from 'prop-types';
import React from 'react';
import { Card } from '@components/admin/cms/Card';

export default function OrderInfo({
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
        <div>
          <span>{shippingAddress.fullName}</span>
        </div>
        <div>
          <span>{shippingAddress.address1}</span>
        </div>
        <div>
          <span>{`${shippingAddress.postcode}, ${shippingAddress.city}`}</span>
        </div>
        <div>
          <span>{`${shippingAddress.province.name}, ${shippingAddress.country.name}`}</span>
        </div>
        <div>
          <span>{shippingAddress.telephone}</span>
        </div>
      </Card.Session>
      <Card.Session title="Billing address">
        <div>
          <span>{billingAddress.fullName}</span>
        </div>
        <div>
          <span>{billingAddress.address1}</span>
        </div>
        <div>
          <span>{`${billingAddress.postcode}, ${billingAddress.city}`}</span>
        </div>
        <div>
          <span>{`${billingAddress.province.name}, ${billingAddress.country.name}`}</span>
        </div>
        <div>
          <span>{billingAddress.telephone}</span>
        </div>
      </Card.Session>
    </Card>
  );
}

OrderInfo.propTypes = {
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
    order(id: getContextValue("orderId")) {
      customerFullName
      customerEmail
      customerUrl
      shippingAddress {
        fullName
        city
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
