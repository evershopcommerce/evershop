import { Card } from '@components/admin/Card.js';
import React from 'react';

interface PaymentSettingMenuProps {
  paymentSettingUrl: string;
}

export default function PaymentSettingMenu({
  paymentSettingUrl
}: PaymentSettingMenuProps) {
  return (
    <Card.Session title={<a href={paymentSettingUrl}>Payment Setting</a>}>
      <div>Configure the available payment methods</div>
    </Card.Session>
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
