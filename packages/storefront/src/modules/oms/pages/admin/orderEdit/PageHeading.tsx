import { PageHeading } from '@components/admin/PageHeading.js';
import React from 'react';

export interface OrderEditPageHeadingProps {
  backUrl: string;
  order: {
    orderNumber: string;
  };
}

export default function OrderEditPageHeading({
  backUrl,
  order
}: OrderEditPageHeadingProps) {
  return (
    <PageHeading backUrl={backUrl} heading={`Editing #${order.orderNumber}`} />
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 5
};

export const query = `
  query Query {
    order(uuid: getContextValue("orderId", null)) {
      orderNumber
    }
    backUrl: url(routeId: "orderGrid")
  }
`;
