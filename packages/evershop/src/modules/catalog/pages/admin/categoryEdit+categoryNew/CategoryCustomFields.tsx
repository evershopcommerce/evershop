import { MetafieldSection } from '@components/admin/metafield/MetafieldSection.js';
import React from 'react';

export default function CategoryCustomFields({
  category
}: {
  category?: { metaData?: Record<string, unknown> } | null;
}): React.ReactElement {
  return <MetafieldSection ownerType="category" values={category?.metaData} />;
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 70
};

// `metaData` is exposed admin-only (Category.admin.graphql) so the editor can
// prefill current values. On categoryNew the category is null and values are empty.
export const query = `
  query Query {
    category(id: getContextValue("categoryId", null)) {
      metaData
    }
  }
`;
