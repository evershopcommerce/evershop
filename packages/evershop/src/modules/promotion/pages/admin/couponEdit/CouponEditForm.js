import React from 'react';
import CouponForm from '../../../components/CouponForm';

export default function CouponEditForm({ action, gridUrl }) {
  return <CouponForm
    method={"PUT"}
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
    action: url(routeId: "couponUpdate", params: [{key: "id", value: getContextValue("couponId", undefined, true)}])
    gridUrl: url(routeId: "couponGrid")
  }
`;