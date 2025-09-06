import { Card } from '@components/admin/Card.js';
import React from 'react';

interface StoreSettingMenuProps {
  storeSettingUrl: string;
}

export default function StoreSettingMenu({
  storeSettingUrl
}: StoreSettingMenuProps) {
  return (
    <Card.Session title={<a href={storeSettingUrl}>Store Setting</a>}>
      <div>Configure your store information</div>
    </Card.Session>
  );
}

export const layout = {
  areaId: 'settingPageMenu',
  sortOrder: 5
};

export const query = `
  query Query {
    storeSettingUrl: url(routeId: "storeSetting")
  }
`;
