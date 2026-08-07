import { Card } from '@components/admin/Card.js';
import { InputField } from '@components/common/form/InputField.js';
import { ToggleField } from '@components/common/form/ToggleField.js';
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
    <Card title="Cash On Delivery Payment">
      <Card.Session>
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-1 items-center flex">
            <h4>Enable?</h4>
          </div>
          <div className="col-span-2">
            <ToggleField
              name="codPaymentStatus"
              defaultValue={codPaymentStatus}
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
              name="codDisplayName"
              placeholder="Display Name"
              defaultValue={codDisplayName}
            />
          </div>
        </div>
      </Card.Session>
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
