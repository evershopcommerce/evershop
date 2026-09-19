import { SettingMenuItem } from '@components/admin/SettingMenuItem.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface SystemSettingMenuProps {
  systemSettingUrl: string;
}

export default function SystemSettingMenu({
  systemSettingUrl
}: SystemSettingMenuProps) {
  return (
    <SettingMenuItem
      url={systemSettingUrl}
      title={_('System Setting')}
      description={_('File storage and service credentials')}
    />
  );
}

export const layout = {
  areaId: 'settingPageMenu',
  sortOrder: 30
};

export const query = `
  query Query {
    systemSettingUrl: url(routeId: "systemSetting")
  }
`;
