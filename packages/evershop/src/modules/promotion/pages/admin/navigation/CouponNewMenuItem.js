import PropTypes from 'prop-types'
import React from 'react';
import Icon from '@heroicons/react/solid/esm/GiftIcon';
import MenuItem from '../../../../cms/views/admin/NavigationItem';

export default function CouponNewMenuItem({ url }) {
  return <MenuItem Icon={Icon} title="New coupon" url={url} />;
}

CouponNewMenuItem.propTypes = {
  url: PropTypes.string.isRequired
}
