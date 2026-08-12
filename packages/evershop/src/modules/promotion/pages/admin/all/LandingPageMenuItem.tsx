import { NavigationItem } from '@components/admin/NavigationItem.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { LayoutTemplate } from 'lucide-react';
import React from 'react';

interface LandingPageMenuItemProps {
  landingPageGrid: string;
}

export default function LandingPageMenuItem({
  landingPageGrid
}: LandingPageMenuItemProps) {
  return (
    <NavigationItem
      Icon={LayoutTemplate}
      url={landingPageGrid}
      title={_('Landing Pages')}
    />
  );
}

// Inject into the existing Promotion menu group (rendered by CouponMenuGroup as
// an Area with id `couponMenuGroup`) without editing CouponMenuGroup itself.
export const layout = {
  areaId: 'couponMenuGroup',
  sortOrder: 20
};

export const query = `
  query Query {
    landingPageGrid: url(routeId: "landingPageGrid")
  }
`;
