import React from 'react';
import Button from '../../../../../lib/components/form/Button';

export default function NewAttributeButton({ newAttributeUrl }) {
  return <Button url={newAttributeUrl} title="New Attribute" />
}

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 10
}

export const query = `
  query Query {
    newAttributeUrl: url(routeId: "attributeNew")
  }
`