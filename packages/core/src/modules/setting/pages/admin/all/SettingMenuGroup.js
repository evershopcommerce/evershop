import React from 'react';
import CogIcon from '@heroicons/react/solid/esm/CogIcon';
import BuildingIcon from '@heroicons/react/solid/esm/OfficeBuildingIcon';
import Card from '@heroicons/react/solid/esm/CreditCardIcon';
import Shipping from '@heroicons/react/solid/esm/ArchiveIcon';
import NavigationItemGroup from '../../../../cms/components/admin/NavigationItemGroup';

export default function CmsMenuGroup({ storeSetting }) {
  return <NavigationItemGroup
    id="settingMenuGroup"
    name="Setting"
    Icon={() => <CogIcon width={15} height={15} />}
    items={[
      {
        Icon: BuildingIcon,
        url: storeSetting,
        title: "Store Details"
      },
      {
        Icon: Card,
        url: storeSetting,
        title: "Payments"
      },
      {
        Icon: Shipping,
        url: storeSetting,
        title: "Shipping"
      }
    ]}
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