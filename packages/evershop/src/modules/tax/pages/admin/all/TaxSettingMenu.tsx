import { Card } from '@components/admin/Card.js';
import React from 'react';

interface TaxSettingMenuProps {
  taxSettingUrl: string;
}

export default function TaxSettingMenu({ taxSettingUrl }: TaxSettingMenuProps) {
  return (
    <Card.Session title={<a href={taxSettingUrl}>Tax Setting</a>}>
      <div>Configure tax classes and tax rates</div>
    </Card.Session>
  );
}

export const layout = {
  areaId: 'settingPageMenu',
  sortOrder: 20
};

export const query = `
  query Query {
    taxSettingUrl: url(routeId: "taxSetting")
  }
`;
