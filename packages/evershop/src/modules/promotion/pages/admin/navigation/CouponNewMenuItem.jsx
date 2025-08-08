import { NavigationItem } from '@components/admin/NavigationItem';
import { GiftIcon } from '@heroicons/react/24/solid';
import PropTypes from 'prop-types';
import React from 'react';

export default function CouponNewMenuItem({ url }) {
  return <NavigationItem Icon={GiftIcon} title="New coupon" url={url} />;
}

CouponNewMenuItem.propTypes = {
  url: PropTypes.string.isRequired
};
