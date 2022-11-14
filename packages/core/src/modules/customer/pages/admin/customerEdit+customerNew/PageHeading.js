import React from 'react';
import PageHeading from '../../../../cms/components/admin/PageHeading';

export default function CategoryEditPageHeading({ backUrl, customer }) {
  return <PageHeading backUrl={backUrl} heading={customer ? `Editing ${customer.fullName}` : `Create A New Customer`} />
}

export const layout = {
  areaId: 'content',
  sortOrder: 5
}

export const query = `
  query Query {
    customer(id: getContextValue("customerId", null)) {
      fullName
    }
    backUrl: url(routeId: "customerGrid")
  }
`