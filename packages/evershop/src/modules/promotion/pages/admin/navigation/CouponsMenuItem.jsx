import { NavigationItem } from '@components/admin/NavigationItem';
import { GiftIcon } from '@heroicons/react/24/solid';
import PropTypes from 'prop-types';
import React from 'react';

export default function CouponsMenuItem({ url }) {
  return <NavigationItem Icon={GiftIcon} title="Coupons" url={url} />;
}

CouponsMenuItem.propTypes = {
  url: PropTypes.string.isRequired
};
