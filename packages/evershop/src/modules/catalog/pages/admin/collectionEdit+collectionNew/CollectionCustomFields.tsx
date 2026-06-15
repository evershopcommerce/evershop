import { MetafieldSection } from '@components/admin/metafield/MetafieldSection.js';
import React from 'react';

export default function CollectionCustomFields({
  collection,
  setting
}: {
  collection?: { metaData?: Record<string, unknown> } | null;
  setting?: { storeCurrency?: string } | null;
}): React.ReactElement {
  return (
    <MetafieldSection
      ownerType="collection"
      values={collection?.metaData}
      currency={setting?.storeCurrency ?? 'USD'}
    />
  );
}

export const layout = {
  areaId: 'collectionFormInner',
  sortOrder: 50
};

// `metaData` is exposed admin-only (Collection.admin.graphql) for prefill;
// `storeCurrency` (= shop.currency) drives `money` fields. The collection edit
// screen loads by code (collectionNew has none → values empty).
export const query = `
  query Query {
    collection(code: getContextValue("collectionCode", null)) {
      metaData
    }
    setting {
      storeCurrency
    }
  }
`;
