import { SettingMenuItem } from '@components/admin/SettingMenuItem.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface CustomerSettingMenuProps {
  customerSettingUrl: string;
}

export default function CustomerSettingMenu({
  customerSettingUrl
}: CustomerSettingMenuProps) {
  return (
    <SettingMenuItem
      url={customerSettingUrl}
      title={_('Customer Setting')}
      description={_('Customer accounts, checkout and addresses')}
    />
  );
}

export const layout = {
  areaId: 'settingPageMenu',
  sortOrder: 6
};

export const query = `
  query Query {
    customerSettingUrl: url(routeId: "customerSetting")
  }
`;
