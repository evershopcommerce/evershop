import React from 'react';
import Icon from '@heroicons/react/solid/esm/CubeIcon';
import NavigationItemGroup from '../../../../cms/components/admin/NavigationItemGroup';

export default function CheckoutMenuGroup({ orderGrid }) {
  return <NavigationItemGroup
    id="checkoutMenuGroup"
    name="Sale"
    items={[
      {
        Icon: Icon,
        url: orderGrid,
        title: "Orders"
      }
    ]}
  />
}

export const layout = {
  areaId: 'adminMenu',
  sortOrder: 40
}

export const query = `
  query Query {
    orderGrid: url(routeId:"orderGrid")
  }
`