import React from 'react';
import PageHeading from '../../../../cms/components/admin/PageHeading';

export default function ProductEditPageHeading({ backUrl, page }) {
  return <PageHeading backUrl={backUrl} heading={page ? `Editing ${page.name}` : `Create A New Page`} />
}

export const layout = {
  areaId: 'content',
  sortOrder: 5
}

export const query = `
  query Query {
    page: cmsPage(id: getContextValue("cmsPageId", null)) {
      name
    }
    backUrl: url(routeId: "cmsPageGrid")
  }
`
