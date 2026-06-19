import { NavigationItemGroup } from '@components/admin/NavigationItemGroup';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Book, Puzzle } from 'lucide-react';
import PropTypes from 'prop-types';
import React from 'react';

export default function CmsMenuGroup({ cmsPageGrid, widgetGrid }) {
  return (
    <NavigationItemGroup
      id="cmsMenuGroup"
      name={_('CMS')}
      items={[
        {
          Icon: Book,
          url: cmsPageGrid,
          title: _('Pages')
        },
        {
          Icon: Puzzle,
          url: widgetGrid,
          title: _('Widgets')
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
