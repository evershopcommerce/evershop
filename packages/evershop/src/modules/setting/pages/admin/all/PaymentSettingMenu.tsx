import { SettingMenuItem } from '@components/admin/SettingMenuItem.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface PaymentSettingMenuProps {
  paymentSettingUrl: string;
}

export default function PaymentSettingMenu({
  paymentSettingUrl
}: PaymentSettingMenuProps) {
  return (
    <SettingMenuItem
      url={paymentSettingUrl}
      title={_('Payment Setting')}
      description={_('Configure the available payment methods')}
    />
  );
}

export const layout = {
  areaId: 'settingPageMenu',
  sortOrder: 10
};

export const query = `
  query Query {
    paymentSettingUrl: url(routeId: "paymentSetting")
  }
`;
