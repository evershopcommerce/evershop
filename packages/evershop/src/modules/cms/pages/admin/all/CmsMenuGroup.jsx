
import { NavigationItemGroup } from '@components/admin/cms/NavigationItemGroup';
import PageIcon from '@heroicons/react/solid/esm/DocumentIcon';
import WidgetIcon from '@heroicons/react/solid/esm/PuzzleIcon';
import PropTypes from 'prop-types';
import React from 'react';

export default function CmsMenuGroup({ cmsPageGrid, widgetGrid }) {
  return (
    <NavigationItemGroup
      id="cmsMenuGroup"
      name="CMS"
      items={[
        {
          Icon: PageIcon,
          url: cmsPageGrid,
          title: 'Pages'
        },
        {
          Icon: WidgetIcon,
          url: widgetGrid,
          title: 'Widgets'
        }
      ]}
    />
  );
}

CmsMenuGroup.propTypes = {
  cmsPageGrid: PropTypes.string.isRequired,
  widgetGrid: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'adminMenu',
  sortOrder: 60
};

export const query = `
  query Query {
    cmsPageGrid: url(routeId:"cmsPageGrid")
    widgetGrid: url(routeId:"widgetGrid")
  }
`;
