import React from 'react';
import Button from '../../../../../lib/components/form/Button';
import PageHeading from '../../../../cms/components/admin/PageHeading';

export default function NewProductButton({ newProductUrl }) {
  return <Button url={newProductUrl} title="New Product" />
}

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 10
}

export const query = `
  query Query {
    newProductUrl: url(routeId: "productNew")
  }
`