import PropTypes from "prop-types"
import React from 'react';
import MenuItem from '../../../../cms/views/admin/NavigationItem';
import Icon from '@heroicons/react/solid/esm/GiftIcon';

export default function CouponsMenuItem({ url }) {
  return <MenuItem Icon={Icon} title="Coupons" url={url} />;
}

CouponsMenuItem.propTypes = {
  url: PropTypes.string.isRequired
}
