import { PageHeading } from '@components/admin/PageHeading.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface NewImportHeadingProps {
  gridUrl: string;
}

export default function NewImportHeading({ gridUrl }: NewImportHeadingProps) {
  return (
    <div className="w-2/3 mx-auto">
      <PageHeading backUrl={gridUrl} heading={_('New import')} />
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    gridUrl: url(routeId: "importGrid")
  }
`;
