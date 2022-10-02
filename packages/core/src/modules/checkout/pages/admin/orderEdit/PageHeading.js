import React from 'react';
import PageHeading from '../../../../cms/components/admin/PageHeading';

export default function OrderEditPageHeading({ backUrl, order }) {
  return <PageHeading backUrl={backUrl} heading={`Editing #${order.orderNumber}`} />
}

export const layout = {
  areaId: 'content',
  sortOrder: 5
}

export const query = `
  query Query {
    order(id: getContextValue("orderId", null)) {
      orderNumber
    }
    backUrl: url(routeId: "orderGrid")
  }
`
