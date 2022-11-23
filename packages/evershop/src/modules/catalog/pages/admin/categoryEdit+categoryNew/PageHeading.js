import React from 'react';
import PageHeading from '../../../../cms/components/admin/PageHeading';

export default function CategoryEditPageHeading({ backUrl, category }) {
  return <PageHeading backUrl={backUrl} heading={category ? `Editing ${category.name}` : `Create A New category`} />
}

export const layout = {
  areaId: 'content',
  sortOrder: 5
}

export const query = `
  query Query {
    category(id: getContextValue("categoryId", null)) {
      name
    }
    backUrl: url(routeId: "categoryGrid")
  }
`