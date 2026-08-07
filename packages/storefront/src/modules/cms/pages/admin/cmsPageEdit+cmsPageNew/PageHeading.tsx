import { PageHeading } from '@components/admin/PageHeading.js';
import React from 'react';

export interface CmsGridPageHeadingProps {
  backUrl: string;
  page?: {
    name?: string;
  };
}

export default function CmsGridPageHeading({
  backUrl,
  page
}: CmsGridPageHeadingProps) {
  return (
    <div className="w-2/3 mx-auto">
      <PageHeading
        backUrl={backUrl}
        heading={page ? `Editing ${page.name}` : 'Create a new page'}
      />
    </div>
  );
}

CmsGridPageHeading.defaultProps = {
  page: null
};

export const layout = {
  areaId: 'content',
  sortOrder: 5
};

export const query = `
  query Query {
    page: cmsPage(id: getContextValue("cmsPageId", null)) {
      name
    }
    backUrl: url(routeId: "cmsPageGrid")
  }
`;
