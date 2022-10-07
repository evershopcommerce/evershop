import React from 'react';
import PageHeading from '../../../../cms/components/admin/PageHeading';

export default function AttributeEditPageHeading({ backUrl, attribute }) {
  return <PageHeading backUrl={backUrl} heading={attribute ? `Editing ${attribute.attributeName}` : `Create A New Attribute`} />
}

export const layout = {
  areaId: 'content',
  sortOrder: 5
}

export const query = `
  query Query {
    attribute(id: getContextValue("attributeId", null)) {
      attributeName
    }
    backUrl: url(routeId: "attributeGrid")
  }
`