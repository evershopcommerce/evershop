import { PageHeading } from '@components/admin/PageHeading.js';
import React from 'react';

export interface AttributeEditPageHeadingProps {
  backUrl?: string;
  attribute?: {
    attributeName?: string;
  };
}

export default function AttributeEditPageHeading({
  backUrl,
  attribute
}: AttributeEditPageHeadingProps) {
  return (
    <PageHeading
      backUrl={backUrl}
      heading={
        attribute
          ? `Editing ${attribute.attributeName}`
          : 'Create a new attribute'
      }
    />
  );
}

AttributeEditPageHeading.defaultProps = {
  attribute: {}
};

export const layout = {
  areaId: 'content',
  sortOrder: 5
};

export const query = `
  query Query {
    attribute(id: getContextValue("attributeId", null)) {
      attributeName
    }
    backUrl: url(routeId: "attributeGrid")
  }
`;
