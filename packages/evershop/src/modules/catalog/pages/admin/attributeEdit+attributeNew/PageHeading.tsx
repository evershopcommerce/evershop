import { PageHeading } from '@components/admin/PageHeading.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
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
          ? _('Editing ${name}', { name: attribute.attributeName || '' })
          : _('Create a new attribute')
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
