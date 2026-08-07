import { PageHeading } from '@components/admin/PageHeading.js';
import React from 'react';

export default function CouponGridHeading() {
  return <PageHeading heading="Coupons" />;
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};
