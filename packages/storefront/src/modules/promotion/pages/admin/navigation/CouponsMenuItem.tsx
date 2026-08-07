import { NavigationItem } from '@components/admin/NavigationItem.js';
import { GiftIcon } from '@heroicons/react/24/solid';
import React from 'react';

interface CouponsMenuItemProps {
  url: string;
}

export default function CouponsMenuItem({ url }: CouponsMenuItemProps) {
  return <NavigationItem Icon={GiftIcon} title="Coupons" url={url} />;
}
