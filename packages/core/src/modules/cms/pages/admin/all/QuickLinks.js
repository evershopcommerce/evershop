import React from 'react';
import NavigationItemGroup from '../../../components/admin/NavigationItemGroup';
import Icon from '@heroicons/react/solid/esm/HomeIcon';

export default function QuickLinks({ dashboard }) {
  return <NavigationItemGroup
    id="quickLinks"
    name="Quick links"
    items={[
      {
        Icon: Icon,
        url: dashboard,
        title: "Dashboard"
      }
    ]}
  />
}

export const layout = {
  areaId: 'adminMenu',
  sortOrder: 10
}

export const query = `
  query Query {
    dashboard: url(routeId: "dashboard")
  }
`