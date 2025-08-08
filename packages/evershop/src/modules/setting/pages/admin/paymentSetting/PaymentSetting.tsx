import { SettingMenu } from '@components/admin/SettingMenu.js';
import Area from '@components/common/Area.js';
import { Form } from '@components/common/form/Form.js';
import React from 'react';

interface PaymentSettingProps {
  saveSettingApi: string;
}

export default function PaymentSetting({
  saveSettingApi
}: PaymentSettingProps) {
  return (
    <div className="main-content-inner">
      <div className="grid grid-cols-6 gap-x-5 grid-flow-row ">
        <div className="col-span-2">
          <SettingMenu />
        </div>
        <div className="col-span-4">
          <Form
            id="paymentSettingForm"
            method="POST"
            action={saveSettingApi}
            successMessage="Payment setting saved"
          >
            <Area id="paymentSetting" className="grid gap-5" />
          </Form>
        </div>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    saveSettingApi: url(routeId: "saveSetting")
  }
`;
