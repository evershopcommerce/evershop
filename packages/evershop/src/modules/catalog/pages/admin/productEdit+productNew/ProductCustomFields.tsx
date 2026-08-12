import { MetafieldSection } from '@components/admin/metafield/MetafieldSection.js';
import React from 'react';

export default function ProductCustomFields({
  product
}: {
  product?: {
    metaData?: Record<string, unknown>;
  } | null;
}): React.ReactElement {
  return <MetafieldSection ownerType="product" values={product?.metaData} />;
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 45
};

// `metaData` is exposed admin-only (Product.admin.graphql) so the editor can
// prefill current values. On productNew the product is null and values are empty.
export const query = `
  query Query {
    product(id: getContextValue("productId", null)) {
      metaData
    }
  }
`;
