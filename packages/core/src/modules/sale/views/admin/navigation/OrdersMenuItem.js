import PropTypes from "prop-types"
import React from 'react';
import MenuItem from '../../../../cms/views/admin/NavigationItem';
import Icon from '@heroicons/react/solid/esm/CubeIcon';

export default function OrdersMenuItem({ url }) {
  return <MenuItem Icon={Icon} title="Orders" url={url} />;
}

OrdersMenuItem.propTypes = {
  url: PropTypes.string.isRequired
}
