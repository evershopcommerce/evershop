import React from 'react';
import { buildUrl } from '@evershop/core/src/lib/router/buildUrl';
import Icon from '@heroicons/react/solid/esm/GiftIcon';
import MenuItem from '../../../../cms/views/admin/NavigationItem';

export default function CouponNewMenuItem() {
  return <MenuItem Icon={Icon} title="New coupon" url={buildUrl('couponNew')} />;
}