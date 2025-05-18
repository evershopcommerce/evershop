import { NavigationItemGroup } from '@components/admin/cms/NavigationItemGroup';
import Icon from '@heroicons/react/solid/esm/CubeIcon';
import PropTypes from 'prop-types';
import React from 'react';

export default function OmsMenuGroup({ orderGrid }) {
  return (
    <NavigationItemGroup
      id="omsMenuGroup"
      name="Sale"
      items={[
        {
          Icon,
          url: orderGrid,
          title: 'Orders'
        }
      ]}
    />
  );
}

OmsMenuGroup.propTypes = {
  orderGrid: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'adminMenu',
  sortOrder: 30
};

export const query = `
  query Query {
    orderGrid: url(routeId:"orderGrid")
  }
`;
