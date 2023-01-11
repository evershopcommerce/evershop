import React from 'react';
import { Field } from '../../../../../lib/components/form/Field';
import { Toggle } from '../../../../../lib/components/form/fields/Toggle';
import { Card } from '../../../../cms/components/admin/Card';

export default function PaypalPayment(
  {
    setting: {
      paypalPaymentStatus,
      paypalDislayName,
      paypalClientId,
      paypalClientSecret,
      paypalEnvironment
    }
  }
) {
  return (
    <Card
      title="Paypal Payment"
    >
      <Card.Session>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-1 items-center flex">
            <h4>Enable?</h4>
          </div>
          <div className="col-span-2">
            <Toggle
              name="paypalPaymentStatus"
              value={paypalPaymentStatus}
            />
          </div>
        </div>
      </Card.Session>
      <Card.Session>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-1 items-center flex">
            <h4>Dislay Name</h4>
          </div>
          <div className="col-span-2">
            <Field
              type="text"
              name="paypalDislayName"
              placeholder="Dislay Name"
              value={paypalDislayName}
            />
          </div>
        </div>
      </Card.Session>
      <Card.Session>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-1 items-center flex">
            <h4>Client ID</h4>
          </div>
          <div className="col-span-2">
            <Field
              type="text"
              name="paypalClientId"
              placeholder="Publishable Key"
              value={paypalClientId}
            />
          </div>
        </div>
      </Card.Session>
      <Card.Session>
        <div className="grid grid-cols-3 gap-2">
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
        <div className="grid grid-cols-3 gap-2">
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
    </Card>
  );
}

export const layout = {
  areaId: 'paymentSetting',
  sortOrder: 15
};

export const query = `
  query Query {
    setting {
      paypalPaymentStatus
      paypalDislayName
      paypalClientId
      paypalClientSecret
      paypalEnvironment
    }
  }
`;
