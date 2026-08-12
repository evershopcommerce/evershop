import { MetafieldSection } from '@components/admin/metafield/MetafieldSection.js';
import React from 'react';

export default function BlogCategoryCustomFields({
  category
}: {
  category?: {
    metaData?: Record<string, unknown>;
  } | null;
}): React.ReactElement {
  return (
    <MetafieldSection ownerType="blog_category" values={category?.metaData} />
  );
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 15
};

// `metaData` is exposed admin-only (BlogCategory.admin.graphql) so the editor
// can prefill current values. Blog admin queries are uuid-as-id
// (blogCategoryUuid). On blogCategoryNew the category is null.
export const query = `
  query Query {
    category: blogCategory(id: getContextValue("blogCategoryUuid", null)) {
      metaData
    }
  }
`;
