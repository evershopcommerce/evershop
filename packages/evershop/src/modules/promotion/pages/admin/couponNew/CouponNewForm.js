import React from 'react';
import CouponForm from '../../../components/CouponForm';

export default function CouponNewForm({ action, gridUrl }) {
  return <CouponForm
    method={"POST"}
    action={action}
    isJSON={true}
    gridUrl={gridUrl}
  />
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
}

export const query = `
  query Query {
    action: url(routeId: "couponCreate")
    gridUrl: url(routeId: "couponGrid")
  }
`;