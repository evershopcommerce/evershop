import React from 'react';
import Icon from '@heroicons/react/solid/esm/DocumentIcon';
import NavigationItemGroup from '../../../components/admin/NavigationItemGroup';

export default function CmsMenuGroup({ cmsPageGrid }) {
  return (
    <NavigationItemGroup
      id="cmsMenuGroup"
      name="CMS"
      items={[
        {
          Icon,
          url: cmsPageGrid,
          title: 'Pages'
        }
      ]}
    />
  );
}

export const layout = {
  areaId: 'adminMenu',
  sortOrder: 60
};

export const query = `
  query Query {
    cmsPageGrid: url(routeId:"cmsPageGrid")
  }
`;
