import { PageHeading } from '@components/admin/PageHeading.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export default function BlogTagEditHeading({
  backUrl,
  tag
}: {
  backUrl?: string;
  tag?: { name?: string } | null;
}) {
  return (
    <PageHeading
      backUrl={backUrl}
      heading={
        tag
          ? _('Editing ${name}', { name: tag.name ?? '' })
          : _('Create a new tag')
      }
    />
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 5
};

export const query = `
  query Query {
    tag: blogTag(id: getContextValue("blogTagUuid", null)) {
      name
    }
    backUrl: url(routeId: "blogTagGrid")
  }
`;
