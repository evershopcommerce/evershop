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
    <Card>
      <CardHeader>
        <CardTitle>{_('Stripe Payment')}</CardTitle>
        <CardDescription>
          {_('Configure your Stripe payment gateway settings')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-1 items-center flex">
            <h4>{_('Enable?')}</h4>
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
      </CardContent>
      <CardContent className="pt-4 border-t border-border">
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-1 items-center flex">
            <h4>{_('Dislay Name')}</h4>
          </div>
          <div className="col-span-2">
            <InputField
              name="stripeDisplayName"
              placeholder={_('Display Name')}
              defaultValue={stripeDisplayName || ''}
            />
          </div>
        </div>
      </CardContent>
      <CardContent className="pt-4 border-t border-border">
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-1 items-center flex">
            <h4>{_('Publishable Key')}</h4>
          </div>
          <div className="col-span-2">
            <InputField
              name="stripePublishableKey"
              placeholder={_('Publishable Key')}
              defaultValue={stripePublishableKey || ''}
            />
          </div>
        </div>
      </CardContent>
      <CardContent className="pt-4 border-t border-border">
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-1 items-center flex">
            <h4>{_('Secret Key')}</h4>
          </div>
          <div className="col-span-2">
            <InputField
              name="stripeSecretKey"
              placeholder={_('Secret Key')}
              defaultValue={stripeSecretKey || ''}
            />
          </div>
        </div>
      </CardContent>
      <CardContent className="pt-4 border-t border-border">
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-1 items-center flex">
            <h4>{_('Webhook Secret Key')}</h4>
          </div>
          <div className="col-span-2">
            <InputField
              name="stripeEndpointSecret"
              placeholder={_('Secret Key')}
              defaultValue={stripeEndpointSecret || ''}
              helperText={_(
                'Your webhook url should be: https://yourdomain.com/api/stripe/webhook'
              )}
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
              name="stripePaymentMode"
              defaultValue={stripePaymentMode}
              options={[
                { label: _('Authorize only'), value: 'authorizeOnly' },
                { label: _('Capture'), value: 'capture' }
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
