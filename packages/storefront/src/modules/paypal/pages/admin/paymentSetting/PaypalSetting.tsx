import { Card } from '@components/admin/Card.js';
import { InputField } from '@components/common/form/InputField.js';
import { RadioGroupField } from '@components/common/form/RadioGroupField.js';
import { ToggleField } from '@components/common/form/ToggleField.js';
import React from 'react';

interface PaypalPaymentProps {
  setting: {
    paypalPaymentStatus: true | false | 0 | 1;
    paypalDisplayName: string;
    paypalClientId: string;
    paypalClientSecret: string;
    paypalEnvironment: string;
    paypalPaymentIntent: string;
  };
}
export default function PaypalPayment({
  setting: {
    paypalPaymentStatus,
    paypalDisplayName,
    paypalClientId,
    paypalClientSecret,
    paypalEnvironment,
    paypalPaymentIntent
  }
}: PaypalPaymentProps) {
  return (
    <Card title="Paypal Payment">
      <Card.Session>
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-1 items-center flex">
            <h4>Enable?</h4>
          </div>
          <div className="col-span-2">
            <ToggleField
              name="paypalPaymentStatus"
              defaultValue={paypalPaymentStatus}
              trueValue={1}
              falseValue={0}
            />
          </div>
        </div>
      </Card.Session>
      <Card.Session>
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-1 items-center flex">
            <h4>Dislay Name</h4>
          </div>
          <div className="col-span-2">
            <InputField
              label="Display Name"
              name="paypalDisplayName"
              placeholder="Display Name"
              defaultValue={paypalDisplayName}
            />
          </div>
        </div>
      </Card.Session>
      <Card.Session>
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-1 items-center flex">
            <h4>Client ID</h4>
          </div>
          <div className="col-span-2">
            <InputField
              label="Client ID"
              name="paypalClientId"
              placeholder="Client ID"
              defaultValue={paypalClientId}
            />
          </div>
        </div>
      </Card.Session>
      <Card.Session>
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-1 items-center flex">
            <h4>Client Secret</h4>
          </div>
          <div className="col-span-2">
            <InputField
              name="paypalClientSecret"
              placeholder="Secret Key"
              label="Client Secret"
              defaultValue={paypalClientSecret}
            />
          </div>
        </div>
      </Card.Session>
      <Card.Session>
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-1 items-center flex">
            <h4>Environment</h4>
          </div>
          <div className="col-span-2">
            <RadioGroupField
              label="Environment"
              name="paypalEnvironment"
              defaultValue={paypalEnvironment}
              options={[
                {
                  label: 'Sandbox',
                  value: 'https://api-m.sandbox.paypal.com'
                },
                {
                  label: 'Live',
                  value: 'https://api-m.paypal.com'
                }
              ]}
            />
          </div>
        </div>
      </Card.Session>
      <Card.Session>
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-1 items-center flex">
            <h4>Payment mode</h4>
          </div>
          <div className="col-span-2">
            <RadioGroupField
              name="paypalPaymentIntent"
              defaultValue={paypalPaymentIntent}
              options={[
                { label: 'Authorize only', value: 'AUTHORIZE' },
                { label: 'Capture', value: 'CAPTURE' }
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
      paypalDisplayName
      paypalClientId
      paypalClientSecret
      paypalEnvironment
      paypalPaymentIntent
    }
  }
`;
