import { NavigationItem } from '@components/admin/NavigationItem';
import { GiftIcon } from '@heroicons/react/24/solid';
import PropTypes from 'prop-types';
import React from 'react';

export default function NewProductQuickLink({ couponNew }) {
  return <NavigationItem Icon={GiftIcon} title="New Coupon" url={couponNew} />;
}

NewProductQuickLink.propTypes = {
  couponNew: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'quickLinks',
  sortOrder: 30
};

export const query = `
  query Query {
    couponNew: url(routeId:"couponNew")
  }
`;
