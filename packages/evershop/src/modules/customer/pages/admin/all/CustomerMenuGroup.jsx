import { NavigationItemGroup } from '@components/admin/NavigationItemGroup';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { User } from 'lucide-react';
import PropTypes from 'prop-types';
import React from 'react';

export default function CustomerMenuGroup({ customerGrid }) {
  return (
    <NavigationItemGroup
      id="customerMenuGroup"
      name={_('Customer')}
      items={[
        {
          Icon: User,
          url: customerGrid,
          title: _('Customers')
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
