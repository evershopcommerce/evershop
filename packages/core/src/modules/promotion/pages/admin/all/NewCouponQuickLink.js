import React from 'react';
import Icon from '@heroicons/react/solid/esm/GiftIcon';
import NavigationItem from '../../../../cms/components/admin/NavigationItem';

export default function NewProductQuickLink({ couponNew }) {
  return <NavigationItem
    Icon={Icon}
    title="New Coupon"
    url={couponNew}
  />
}

export const layout = {
  areaId: 'quickLinks',
  sortOrder: 30
}

export const query = `
  query Query {
    couponNew: url(routeId:"couponNew")
  }
`