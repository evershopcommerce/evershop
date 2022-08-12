import React from 'react';
import { buildUrl } from '@evershop/core/src/lib/router/buildUrl';
import MenuItem from '../../../../cms/views/admin/NavigationItem';
import Icon from '@heroicons/react/solid/esm/GiftIcon';

export default function CouponsMenuItem() {
  return <MenuItem Icon={Icon} title="Coupons" url={buildUrl('couponGrid')} />;
}