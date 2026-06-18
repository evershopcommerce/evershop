import { PageHeading } from '@components/admin/PageHeading.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export interface CouponEditPageHeadingProps {
  backUrl: string;
  coupon?: { coupon: string };
}

export default function CouponEditPageHeading({
  backUrl,
  coupon
}: CouponEditPageHeadingProps) {
  return (
    <PageHeading
      backUrl={backUrl}
      heading={
        coupon
          ? _('Editing ${coupon}', { coupon: coupon.coupon })
          : _('Create a new coupon')
      }
    />
  );
}

CouponEditPageHeading.defaultProps = {
  coupon: null
};

export const layout = {
  areaId: 'content',
  sortOrder: 5
};

export const query = `
  query Query {
    coupon(id: getContextValue("couponId", null)) {
      coupon
    }
    backUrl: url(routeId: "couponGrid")
  }
`;
