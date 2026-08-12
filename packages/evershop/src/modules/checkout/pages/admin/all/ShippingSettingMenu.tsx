import { SettingMenuItem } from '@components/admin/SettingMenuItem.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface ShippingSettingMenuProps {
  shippingSettingUrl: string;
}

export default function ShippingSettingMenu({
  shippingSettingUrl
}: ShippingSettingMenuProps) {
  return (
    <SettingMenuItem
      url={shippingSettingUrl}
      title={_('Shipping Setting')}
      description={_('Where you ship, shipping methods and delivery fee')}
    />
  );
}

export const layout = {
  areaId: 'settingPageMenu',
  sortOrder: 15
};

export const query = `
  query Query {
    shippingSettingUrl: url(routeId: "shippingSetting")
  }
`;
