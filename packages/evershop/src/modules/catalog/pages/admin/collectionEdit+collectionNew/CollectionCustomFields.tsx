import { MetafieldSection } from '@components/admin/metafield/MetafieldSection.js';
import React from 'react';

export default function CollectionCustomFields({
  collection
}: {
  collection?: { metaData?: Record<string, unknown> } | null;
}): React.ReactElement {
  return (
    <MetafieldSection ownerType="collection" values={collection?.metaData} />
  );
}

export const layout = {
  areaId: 'collectionFormInner',
  sortOrder: 50
};

// `metaData` is exposed admin-only (Collection.admin.graphql) for prefill. The
// collection edit screen loads by code (collectionNew has none → values empty).
export const query = `
  query Query {
    collection(code: getContextValue("collectionCode", null)) {
      metaData
    }
  }
`;
