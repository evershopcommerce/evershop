import { Card } from '@components/admin/cms/Card';
import { Field } from '@components/common/form/Field';
import { Toggle } from '@components/common/form/fields/Toggle';
import PropTypes from 'prop-types';
import React from 'react';

export default function PaypalPayment({
  setting: {
    paypalPaymentStatus,
    paypalDisplayName,
    paypalClientId,
    paypalClientSecret,
    paypalEnvironment,
    paypalPaymentIntent
  }
}) {
  return (
    <Card title="Paypal Payment">
      <Card.Session>
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-1 items-center flex">
            <h4>Enable?</h4>
          </div>
          <div className="col-span-2">
            <Toggle name="paypalPaymentStatus" value={paypalPaymentStatus} />
          </div>
        </div>
      </Card.Session>
      <Card.Session>
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-1 items-center flex">
            <h4>Dislay Name</h4>
          </div>
          <div className="col-span-2">
            <Field
              type="text"
              name="paypalDisplayName"
              placeholder="Dislay Name"
              value={paypalDisplayName}
            />
          </div>
        </div>
      </Card.Session>
      <Card.Session>
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-1 items-center flex">
            <h4>Client ID</h4>
          </div>
          <div className="col-span-2">
            <Field
              type="text"
              name="paypalClientId"
              placeholder="Client ID"
              value={paypalClientId}
            />
          </div>
        </div>
      </Card.Session>
      <Card.Session>
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-1 items-center flex">
            <h4>Client Secret</h4>
          </div>
          <div className="col-span-2">
            <Field
              type="text"
              name="paypalClientSecret"
              placeholder="Secret Key"
              value={paypalClientSecret}
            />
          </div>
        </div>
      </Card.Session>
      <Card.Session>
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-1 items-center flex">
            <h4>Environment</h4>
          </div>
          <div className="col-span-2">
            <Field
              type="radio"
              name="paypalEnvironment"
              placeholder="Environment"
              value={paypalEnvironment}
              options={[
                {
                  text: 'Sandbox',
                  value: 'https://api-m.sandbox.paypal.com'
                },
                {
                  text: 'Live',
                  value: 'https://api-m.paypal.com'
                }
              ]}
            />
          </div>
        </div>
      </Card.Session>
      <Card.Session>
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-1 items-center flex">
            <h4>Payment mode</h4>
          </div>
          <div className="col-span-2">
            <Field
              type="radio"
              name="paypalPaymentIntent"
              placeholder="Payment Mode"
              value={paypalPaymentIntent}
              options={[
                { text: 'Authorize only', value: 'AUTHORIZE' },
                { text: 'Capture', value: 'CAPTURE' }
              ]}
            />
          </div>
        </div>
      </Card.Session>
    </Card>
  );
}

PaypalPayment.propTypes = {
  setting: PropTypes.shape({
    paypalPaymentStatus: PropTypes.number,
    paypalDisplayName: PropTypes.string,
    paypalClientId: PropTypes.string,
    paypalClientSecret: PropTypes.string,
    paypalEnvironment: PropTypes.string,
    paypalPaymentIntent: PropTypes.string
  })
};

PaypalPayment.defaultProps = {
  setting: {
    paypalPaymentStatus: 0,
    paypalDisplayName: '',
    paypalClientId: '',
    paypalClientSecret: '',
    paypalEnvironment: '',
    paypalPaymentIntent: 'CAPTURE'
  }
};

export const layout = {
  areaId: 'paymentSetting',
  sortOrder: 15
};

export const query = `
  query Query {
    setting {
      paypalPaymentStatus
      paypalDisplayName
      paypalClientId
      paypalClientSecret
      paypalEnvironment
      paypalPaymentIntent
    }
  }
`;
