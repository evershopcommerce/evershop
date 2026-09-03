import { SettingMenuItem } from '@components/admin/SettingMenuItem.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface CashbackSettingMenuProps {
  cashbackSettingUrl: string;
}

export default function CashbackSettingMenu({
  cashbackSettingUrl
}: CashbackSettingMenuProps) {
  return (
    <SettingMenuItem
      url={cashbackSettingUrl || '/setting/cashback'}
      title={_('Cashback Setting')}
      description={_('Manage customer rebate percentage and cashback rules')}
    />
  );
}

export const layout = {
  areaId: 'settingPageMenu',
  sortOrder: 45
};

export const query = `
  query Query {
    cashbackSettingUrl: url(routeId: "cashbackSetting")
  }
`;
