import React from 'react';
import Button from '../../../../../lib/components/form/Button';

export default function NewCouponButton({ newCouponUrl }) {
  return <Button url={newCouponUrl} title="New Coupon" />
}

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 10
}

export const query = `
  query Query {
    newCouponUrl: url(routeId: "couponNew")
  }
`