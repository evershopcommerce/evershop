import PropTypes from 'prop-types';
import React from 'react';
import Icon from '@heroicons/react/solid/esm/GiftIcon';
import NavigationItem from '@components/admin/cms/NavigationItem';

export default function CouponNewMenuItem({ url }) {
  return <NavigationItem Icon={Icon} title="New coupon" url={url} />;
}

CouponNewMenuItem.propTypes = {
  url: PropTypes.string.isRequired
};
