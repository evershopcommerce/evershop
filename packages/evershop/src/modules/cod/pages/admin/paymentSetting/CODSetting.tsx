import { InputField } from '@components/common/form/InputField.js';
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

interface CODPaymentProps {
  setting: {
    codPaymentStatus: true | false | 0 | 1;
    codDisplayName: string;
  };
}
export default function CODPayment({
  setting: { codPaymentStatus, codDisplayName }
}: CODPaymentProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{_('Cash On Delivery Payment')}</CardTitle>
        <CardDescription>
          {_('Configure your Cash On Delivery payment gateway settings')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-1 items-center flex">
            <h4>{_('Enable?')}</h4>
          </div>
          <div className="col-span-2 flex justify-start">
            <ToggleField
              name="codPaymentStatus"
              defaultValue={codPaymentStatus}
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
              name="codDisplayName"
              placeholder={_('Display Name')}
              defaultValue={codDisplayName}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const layout = {
  areaId: 'paymentSetting',
  sortOrder: 20
};

export const query = `
  query Query {
    setting {
      codPaymentStatus
      codDisplayName
    }
  }
`;
