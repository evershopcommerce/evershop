import { PageHeading } from '@components/admin/PageHeading.js';
import React from 'react';

export interface CollectionEditPageHeadingProps {
  backUrl: string;
  collection?: {
    name?: string;
  };
}

export default function CollectionEditPageHeading({
  backUrl,
  collection
}: CollectionEditPageHeadingProps) {
  return (
    <div className="w-2/3" style={{ margin: '0 auto' }}>
      <PageHeading
        backUrl={backUrl}
        heading={
          collection ? `Editing ${collection.name}` : 'Create a new collection'
        }
      />
    </div>
  );
}

CollectionEditPageHeading.defaultProps = {
  collection: {}
};

export const layout = {
  areaId: 'content',
  sortOrder: 5
};

export const query = `
  query Query {
    collection(code: getContextValue("collectionCode", null)) {
      name
    }
    backUrl: url(routeId: "collectionGrid")
  }
`;
