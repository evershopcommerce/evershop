import React from 'react';
import UsersIcon from '@heroicons/react/solid/esm/UsersIcon';
import NavigationItemGroup from '../../../../cms/components/admin/NavigationItemGroup';

export default function CustomerMenuGroup({ customerGrid }) {
  return <NavigationItemGroup
    id="customerMenuGroup"
    name="Customer"
    items={[
      {
        Icon: UsersIcon,
        url: customerGrid,
        title: "Customers"
      }
    ]}
  />
}

export const layout = {
  areaId: 'adminMenu',
  sortOrder: 23
}

export const query = `
  query Query {
    customerGrid: url(routeId:"customerGrid")
  }
`