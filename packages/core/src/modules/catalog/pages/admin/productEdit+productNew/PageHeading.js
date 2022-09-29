import React from 'react';
import PageHeading from '../../../../cms/components/admin/PageHeading';

export default function ProductEditPageHeading({ backUrl, product }) {
  return <PageHeading backUrl={backUrl} heading={product ? `Editing ${product.name}` : `Create A New Product`} />
}

export const layout = {
  areaId: 'content',
  sortOrder: 5
}

export const query = `
  query Query {
    product(id: getContextValue("productId", null)) {
      name
    }
    backUrl: url(routeId: "productGrid")
  }
`