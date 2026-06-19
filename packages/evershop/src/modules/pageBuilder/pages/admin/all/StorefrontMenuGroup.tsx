import { NavigationItemGroup } from '@components/admin/NavigationItemGroup.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { LayoutDashboard } from 'lucide-react';
import React from 'react';

interface StorefrontMenuGroupProps {
  pageBuilder: string;
}

export default function StorefrontMenuGroup({
  pageBuilder
}: StorefrontMenuGroupProps) {
  return (
    <NavigationItemGroup
      id="storefrontMenuGroup"
      name={_('Storefront')}
      items={[
        {
          Icon: LayoutDashboard,
          url: pageBuilder,
          title: _('Page builder')
        }
      ]}
    />
  );
}

export const layout = {
  areaId: 'adminMenu',
  sortOrder: 65
};

export const query = `
  query Query {
    pageBuilder: url(routeId:"pageBuilder")
  }
`;
