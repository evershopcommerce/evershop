import { PageHeading } from '@components/admin/PageHeading.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export default function BlogCategoryEditHeading({
  backUrl,
  category
}: {
  backUrl?: string;
  category?: { name?: string } | null;
}) {
  return (
    <PageHeading
      backUrl={backUrl}
      heading={
        category
          ? _('Editing ${name}', { name: category.name ?? '' })
          : _('Create a new category')
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
    category: blogCategory(id: getContextValue("blogCategoryUuid", null)) {
      name
    }
    backUrl: url(routeId: "blogCategoryGrid")
  }
`;
