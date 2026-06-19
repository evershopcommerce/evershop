import { InputField } from '@components/common/form/InputField.js';
import { RadioGroupField } from '@components/common/form/RadioGroupField.js';
import { ToggleField } from '@components/common/form/ToggleField.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
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
    <Card>
      <CardHeader>
        <CardTitle>{_('Paypal Payment')}</CardTitle>
        <CardDescription>
          {_('Configure your Paypal payment gateway settings')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-1 items-center flex">
            <h4>{_('Enable?')}</h4>
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
      </CardContent>
      <CardContent className="pt-4 border-t border-border">
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-1 items-center flex">
            <h4>{_('Dislay Name')}</h4>
          </div>
          <div className="col-span-2">
            <InputField
              name="paypalDisplayName"
              placeholder={_('Display Name')}
              defaultValue={paypalDisplayName}
            />
          </div>
        </div>
      </CardContent>
      <CardContent className="pt-4 border-t border-border">
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-1 items-center flex">
            <h4>{_('Client ID')}</h4>
          </div>
          <div className="col-span-2">
            <InputField
              name="paypalClientId"
              placeholder={_('Client ID')}
              defaultValue={paypalClientId}
            />
          </div>
        </div>
      </CardContent>
      <CardContent className="pt-4 border-t border-border">
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-1 items-center flex">
            <h4>{_('Client Secret')}</h4>
          </div>
          <div className="col-span-2">
            <InputField
              name="paypalClientSecret"
              placeholder={_('Secret Key')}
              defaultValue={paypalClientSecret}
            />
          </div>
        </div>
      </CardContent>
      <CardContent className="pt-4 border-t border-border">
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-1 items-center flex">
            <h4>{_('Environment')}</h4>
          </div>
          <div className="col-span-2">
            <RadioGroupField
              name="paypalEnvironment"
              defaultValue={paypalEnvironment}
              options={[
                {
                  label: _('Sandbox'),
                  value: 'https://api-m.sandbox.paypal.com'
                },
                {
                  label: _('Live'),
                  value: 'https://api-m.paypal.com'
                }
              ]}
            />
          </div>
        </div>
      </CardContent>
      <CardContent className="pt-4 border-t border-border">
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-1 items-center flex">
            <h4>{_('Payment mode')}</h4>
          </div>
          <div className="col-span-2">
            <RadioGroupField
              name="paypalPaymentIntent"
              defaultValue={paypalPaymentIntent}
              options={[
                { label: _('Authorize only'), value: 'AUTHORIZE' },
                { label: _('Capture'), value: 'CAPTURE' }
              ]}
            />
          </div>
        </div>
      </CardContent>
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
