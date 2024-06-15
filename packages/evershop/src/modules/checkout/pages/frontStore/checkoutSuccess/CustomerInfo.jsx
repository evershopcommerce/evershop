import PropTypes from 'prop-types';
import React from 'react';
import Button from '@components/common/form/Button';
import { AddressSummary } from '@components/common/customer/address/AddressSummary';
import { _ } from '@evershop/evershop/src/lib/locale/translate';

export default function CustomerInfo({
  order: {
    orderNumber,
    customerFullName,
    customerEmail,
    paymentMethodName,
    shippingAddress,
    billingAddress
  }
}) {
  return (
    <div className="checkout-success-customer-info">
      <h3 className="thank-you flex justify-start space-x-8">
        <div className="check flex justify-center self-center text-interactive">
          <svg
            style={{ width: '3rem', height: '3rem' }}
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
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

      <div className="customer-info mt-12 mb-8">
        <div className="grid grid-cols-2 gap-12">
          <div className="grid grid-cols-1 gap-12">
            <div className="mb-8">
              <div className="mb-3">
                <h3>{_('Contact information')}</h3>
              </div>
              <div className="text-textSubdued">
                {customerFullName || billingAddress?.fullName}
              </div>
              <div className="text-textSubdued">{customerEmail}</div>
            </div>
            <div>
              <div className="mb-3">
                <h3>{_('Shipping Address')}</h3>
              </div>
              <div className="text-textSubdued">
                <AddressSummary address={shippingAddress} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-12">
            <div className="mb-8">
              <div className="mb-3">
                <h3>{_('Payment Method')}</h3>
              </div>
              <div className="text-textSubdued">{paymentMethodName}</div>
            </div>
            <div>
              <div className="mb-3">
                <h3>{_('Billing Address')}</h3>
              </div>
              <div className="text-textSubdued">
                <AddressSummary address={billingAddress} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <Button url="/" title={_('CONTINUE SHOPPING')} />
    </div>
  );
}

CustomerInfo.propTypes = {
  order: PropTypes.shape({
    orderNumber: PropTypes.string.isRequired,
    customerFullName: PropTypes.string,
    customerEmail: PropTypes.string.isRequired,
    paymentMethodName: PropTypes.string.isRequired,
    shippingAddress: PropTypes.shape({
      fullName: PropTypes.string,
      postcode: PropTypes.string,
      telephone: PropTypes.string,
      country: PropTypes.shape({
        name: PropTypes.string,
        code: PropTypes.string
      }),
      province: PropTypes.shape({
        name: PropTypes.string,
        code: PropTypes.string
      }),
      city: PropTypes.string,
      address1: PropTypes.string,
      address2: PropTypes.string
    }),
    billingAddress: PropTypes.shape({
      fullName: PropTypes.string,
      postcode: PropTypes.string,
      telephone: PropTypes.string,
      country: PropTypes.shape({
        name: PropTypes.string,
        code: PropTypes.string
      }),
      province: PropTypes.shape({
        name: PropTypes.string,
        code: PropTypes.string
      }),
      city: PropTypes.string,
      address1: PropTypes.string,
      address2: PropTypes.string
    })
  }).isRequired
};

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
