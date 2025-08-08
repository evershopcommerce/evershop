import { Card } from '@components/admin/Card.js';
import { InputField } from '@components/common/form/InputField.js';
import { RadioGroupField } from '@components/common/form/RadioGroupField.js';
import { ToggleField } from '@components/common/form/ToggleField.js';
import React from 'react';

interface StripePaymentProps {
  setting: {
    stripePaymentStatus: true | false | 0 | 1;
    stripeDisplayName: string;
    stripePublishableKey: string;
    stripeSecretKey: string;
    stripeEndpointSecret: string;
    stripePaymentMode: string;
  };
}
export default function StripePayment({
  setting: {
    stripePaymentStatus,
    stripeDisplayName,
    stripePublishableKey,
    stripeSecretKey,
    stripeEndpointSecret,
    stripePaymentMode
  }
}: StripePaymentProps) {
  return (
    <Card title="Stripe Payment">
      <Card.Session>
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-1 items-center flex">
            <h4>Enable?</h4>
          </div>
          <div className="col-span-2">
            <ToggleField
              name="stripePaymentStatus"
              defaultValue={stripePaymentStatus}
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
              name="stripeDisplayName"
              placeholder="Display Name"
              defaultValue={stripeDisplayName}
            />
          </div>
        </div>
      </Card.Session>
      <Card.Session>
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-1 items-center flex">
            <h4>Publishable Key</h4>
          </div>
          <div className="col-span-2">
            <InputField
              label="Publishable Key"
              name="stripePublishableKey"
              placeholder="Publishable Key"
              defaultValue={stripePublishableKey}
            />
          </div>
        </div>
      </Card.Session>
      <Card.Session>
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-1 items-center flex">
            <h4>Secret Key</h4>
          </div>
          <div className="col-span-2">
            <InputField
              label="Secret Key"
              name="stripeSecretKey"
              placeholder="Secret Key"
              defaultValue={stripeSecretKey}
            />
          </div>
        </div>
      </Card.Session>
      <Card.Session>
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-1 items-center flex">
            <h4>Webhook Secret Key</h4>
          </div>
          <div className="col-span-2">
            <InputField
              name="stripeEndpointSecret"
              placeholder="Secret Key"
              label="Webhook Secret Key"
              defaultValue={stripeEndpointSecret}
              helperText="Your webhook url should be: https://yourdomain.com/api/stripe/webhook"
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
              name="stripePaymentMode"
              defaultValue={stripePaymentMode}
              options={[
                { label: 'Authorize only', value: 'authorizeOnly' },
                { label: 'Capture', value: 'capture' }
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
  sortOrder: 10
};

export const query = `
  query Query {
    setting {
      stripeDisplayName
      stripePaymentStatus
      stripePublishableKey
      stripeSecretKey
      stripeEndpointSecret
      stripePaymentMode
    }
  }
`;
