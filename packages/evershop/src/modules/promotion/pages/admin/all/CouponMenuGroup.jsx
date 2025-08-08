import { NavigationItemGroup } from '@components/admin/NavigationItemGroup';
import { GiftIcon } from '@heroicons/react/24/solid';
import PropTypes from 'prop-types';
import React from 'react';

export default function CatalogMenuGroup({ couponGrid }) {
  return (
    <NavigationItemGroup
      id="couponMenuGroup"
      name="Promotion"
      items={[
        {
          Icon: GiftIcon,
          url: couponGrid,
          title: 'Coupons'
        }
      ]}
    />
  );
}

CatalogMenuGroup.propTypes = {
  couponGrid: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'adminMenu',
  sortOrder: 50
};

export const query = `
  query Query {
    couponGrid: url(routeId:"couponGrid")
  }
`;
