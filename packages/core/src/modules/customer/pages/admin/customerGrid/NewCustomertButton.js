import React from 'react';
import Button from '../../../../../lib/components/form/Button';

export default function NewCustomerButton({ newCustomerUrl }) {
  return <Button url={newCustomerUrl} title="New Customer" />
}

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 10
}

export const query = `
  query Query {
    newCustomerUrl: url(routeId: "customerNew")
  }
`