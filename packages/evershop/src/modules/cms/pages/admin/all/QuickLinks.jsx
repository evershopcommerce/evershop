import { NavigationItemGroup } from '@components/admin/NavigationItemGroup';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { HomeIcon } from 'lucide-react';
import PropTypes from 'prop-types';
import React from 'react';

export default function QuickLinks({ dashboard }) {
  return (
    <NavigationItemGroup
      id="quickLinks"
      name={_('Quick links')}
      items={[
        {
          Icon: HomeIcon,
          url: dashboard,
          title: _('Dashboard')
        }
      ]}
    />
  );
}

QuickLinks.propTypes = {
  dashboard: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'adminMenu',
  sortOrder: 10
};

export const query = `
  query Query {
    dashboard: url(routeId: "dashboard")
  }
`;
