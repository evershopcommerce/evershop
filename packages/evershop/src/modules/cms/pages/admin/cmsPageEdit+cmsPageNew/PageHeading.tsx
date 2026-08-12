import { PageHeading } from '@components/admin/PageHeading.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export interface CmsGridPageHeadingProps {
  backUrl: string;
  page?: {
    name?: string;
  } | null;
}

export default function CmsGridPageHeading({
  backUrl,
  page = null
}: CmsGridPageHeadingProps) {
  return (
    <div className="w-2/3 mx-auto">
      <PageHeading
        backUrl={backUrl}
        heading={
          page ? _('Editing ${name}', { name: page.name ?? '' }) : _('Create a new page')
        }
      />
    </div>
  );
}

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
