import { NavigationItem } from '@components/admin/cms/NavigationItem';
import Icon from '@heroicons/react/solid/esm/GiftIcon';
import PropTypes from 'prop-types';
import React from 'react';

export default function CouponsMenuItem({ url }) {
  return <NavigationItem Icon={Icon} title="Coupons" url={url} />;
}

CouponsMenuItem.propTypes = {
  url: PropTypes.string.isRequired
};
