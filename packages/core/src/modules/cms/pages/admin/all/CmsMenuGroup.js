import React from 'react';
import NavigationItemGroup from '../../../components/admin/NavigationItemGroup';
import Icon from '@heroicons/react/solid/esm/DocumentIcon';

export default function CmsMenuGroup({ cmsPageGrid }) {
  return <NavigationItemGroup
    id="cmsMenuGroup"
    name="CMS"
    items={[
      {
        Icon: Icon,
        url: cmsPageGrid,
        title: "Pages"
      }
    ]}
  />
}

export const layout = {
  areaId: 'adminMenu',
  sortOrder: 30
}

export const query = `
  query Query {
    cmsPageGrid: url(routeId:"cmsPageGrid")
  }
`