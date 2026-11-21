import { PageHeading } from '@components/admin/PageHeading.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface ImportViewHeadingProps {
  gridUrl: string;
}

export default function ImportViewHeading({ gridUrl }: ImportViewHeadingProps) {
  return (
    <div className="w-2/3 mx-auto">
      <PageHeading backUrl={gridUrl} heading={_('Import')} />
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
