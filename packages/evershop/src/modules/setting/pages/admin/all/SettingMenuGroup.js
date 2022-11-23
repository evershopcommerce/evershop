import React from 'react';
import CogIcon from '@heroicons/react/solid/esm/CogIcon';
import NavigationItemGroup from '../../../../cms/components/admin/NavigationItemGroup';

export default function CmsMenuGroup({ storeSetting }) {
  return <NavigationItemGroup
    id="settingMenuGroup"
    name="Setting"
    Icon={() => <CogIcon width={15} height={15} />}
    url={storeSetting}
  />
}

export const layout = {
  areaId: 'adminMenu',
  sortOrder: 500
}

export const query = `
  query Query {
    storeSetting: url(routeId:"storeSetting")
  }
`