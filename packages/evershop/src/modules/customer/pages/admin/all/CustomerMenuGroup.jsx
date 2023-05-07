import PropTypes from 'prop-types';
import React from 'react';
import UsersIcon from '@heroicons/react/solid/esm/UsersIcon';
import NavigationItemGroup from '@components/admin/cms/NavigationItemGroup';

export default function CustomerMenuGroup({ customerGrid }) {
  return (
    <NavigationItemGroup
      id="customerMenuGroup"
      name="Customer"
      items={[
        {
          Icon: UsersIcon,
          url: customerGrid,
          title: 'Customers'
        }
      ]}
    />
  );
}

CustomerMenuGroup.propTypes = {
  customerGrid: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'adminMenu',
  sortOrder: 40
};

export const query = `
  query Query {
    customerGrid: url(routeId:"customerGrid")
  }
`;
