import React from 'react';
import Button from '../../../../../lib/components/form/Button';

export default function NewCategoryButton({ newCateoryUrl }) {
  return <Button url={newCateoryUrl} title="New Category" />
}

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 10
}

export const query = `
  query Query {
    newCateoryUrl: url(routeId: "categoryNew")
  }
`