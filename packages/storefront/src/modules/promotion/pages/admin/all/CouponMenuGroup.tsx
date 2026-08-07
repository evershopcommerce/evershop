import { NavigationItemGroup } from '@components/admin/NavigationItemGroup.js';
import { GiftIcon } from '@heroicons/react/24/solid';
import React from 'react';

interface CouponMenuGroupProps {
  couponGrid: string;
}

export default function CatalogMenuGroup({ couponGrid }: CouponMenuGroupProps) {
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

export const layout = {
  areaId: 'adminMenu',
  sortOrder: 50
};

export const query = `
  query Query {
    couponGrid: url(routeId:"couponGrid")
  }
`;
