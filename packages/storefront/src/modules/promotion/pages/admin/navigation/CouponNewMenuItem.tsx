import { NavigationItem } from '@components/admin/NavigationItem.js';
import { GiftIcon } from '@heroicons/react/24/solid';
import React from 'react';

interface CouponNewMenuItemProps {
  url: string;
}

export default function CouponNewMenuItem({ url }: CouponNewMenuItemProps) {
  return <NavigationItem Icon={GiftIcon} title="New coupon" url={url} />;
}
