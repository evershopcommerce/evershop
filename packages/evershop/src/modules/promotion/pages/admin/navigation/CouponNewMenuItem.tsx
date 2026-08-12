import { NavigationItem } from '@components/admin/NavigationItem.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Gift } from 'lucide-react';
import React from 'react';

interface CouponNewMenuItemProps {
  url: string;
}

export default function CouponNewMenuItem({ url }: CouponNewMenuItemProps) {
  return <NavigationItem Icon={Gift} title={_('New coupon')} url={url} />;
}
