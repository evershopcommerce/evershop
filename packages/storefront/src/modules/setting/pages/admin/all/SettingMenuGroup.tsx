import { NavigationItemGroup } from '@components/admin/NavigationItemGroup.js';
import { CogIcon } from '@heroicons/react/24/solid';
import React from 'react';

interface CmsMenuGroupProps {
  storeSetting: string;
}

export default function CmsMenuGroup({ storeSetting }: CmsMenuGroupProps) {
  return (
    <NavigationItemGroup
      id="settingMenuGroup"
      name="Setting"
      Icon={() => <CogIcon width={15} height={15} />}
      url={storeSetting}
    />
  );
}

export const layout = {
  areaId: 'adminMenu',
  sortOrder: 500
};

export const query = `
  query Query {
    storeSetting: url(routeId:"storeSetting")
  }
`;
