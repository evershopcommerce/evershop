import Button from '@components/common/Button.js';
import React from 'react';

interface NewCouponButtonProps {
  newCouponUrl: string;
}

export default function NewCouponButton({
  newCouponUrl
}: NewCouponButtonProps) {
  return <Button url={newCouponUrl} title="New Coupon" />;
}

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 10
};

export const query = `
  query Query {
    newCouponUrl: url(routeId: "couponNew")
  }
`;
