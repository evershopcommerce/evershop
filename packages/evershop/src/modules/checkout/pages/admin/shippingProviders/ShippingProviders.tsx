import { SettingMenu } from '@components/admin/SettingMenu.js';
import Area from '@components/common/Area.js';
import { Form } from '@components/common/form/Form.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface ShippingProvidersProps {
  saveSettingApi: string;
}

/**
 * Shipping Providers settings page — same structure as the Payment settings
 * page (`setting/pages/admin/paymentSetting/PaymentSetting.tsx`): one
 * section per provider, each provider owns its section as a React component
 * mounted into the `shippingProviderSetting` area (Core ships its methods
 * section; extensions like Shippo/ShipStation ship their credentials
 * sections). The surrounding form posts every registered field to the
 * saveSetting API.
 */
export default function ShippingProviders({
  saveSettingApi
}: ShippingProvidersProps) {
  return (
    <div className="main-content-inner">
      <div className="grid grid-cols-6 gap-x-5 grid-flow-row ">
        <div className="col-span-2">
          <SettingMenu />
        </div>
        <div className="col-span-4">
          <Form
            id="shippingProviderSettingForm"
            method="POST"
            action={saveSettingApi}
            successMessage={_('Shipping provider setting saved')}
          >
            <Area id="shippingProviderSetting" className="grid gap-5" />
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
