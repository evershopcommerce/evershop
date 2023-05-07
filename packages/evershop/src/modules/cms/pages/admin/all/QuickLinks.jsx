import PropTypes from 'prop-types';
import React from 'react';
import Icon from '@heroicons/react/solid/esm/HomeIcon';
import NavigationItemGroup from '@components/admin/cms/NavigationItemGroup';

export default function QuickLinks({ dashboard }) {
  return (
    <NavigationItemGroup
      id="quickLinks"
      name="Quick links"
      items={[
        {
          Icon,
          url: dashboard,
          title: 'Dashboard'
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
