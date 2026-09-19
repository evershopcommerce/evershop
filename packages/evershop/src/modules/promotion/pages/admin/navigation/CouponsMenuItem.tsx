import { NavigationItem } from '@components/admin/NavigationItem.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Gift } from 'lucide-react';
import React from 'react';

interface CouponsMenuItemProps {
  url: string;
}

export default function CouponsMenuItem({ url }: CouponsMenuItemProps) {
  return <NavigationItem Icon={Gift} title={_('Coupons')} url={url} />;
}
