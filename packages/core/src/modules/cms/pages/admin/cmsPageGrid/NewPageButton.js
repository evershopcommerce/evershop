import React from 'react';
import Button from '../../../../../lib/components/form/Button';

export default function NewPageButton({ newPageUrl }) {
  return <Button url={newPageUrl} title="New Page" />
}

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 10
}

export const query = `
  query Query {
    newPageUrl: url(routeId: "cmsPageNew")
  }
`