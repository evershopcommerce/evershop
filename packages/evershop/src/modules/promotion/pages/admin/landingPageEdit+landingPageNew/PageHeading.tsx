import { PageHeading } from '@components/admin/PageHeading.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export interface LandingPageEditPageHeadingProps {
  backUrl: string;
  landingPage?: {
    name?: string;
  };
}

export default function LandingPageEditPageHeading({
  backUrl,
  landingPage
}: LandingPageEditPageHeadingProps) {
  return (
    <PageHeading
      backUrl={backUrl}
      heading={
        landingPage
          ? _('Editing ${name}', { name: landingPage.name ?? '' })
          : _('Create a new landing page')
      }
    />
  );
}

LandingPageEditPageHeading.defaultProps = {
  landingPage: null
};

export const layout = {
  areaId: 'content',
  sortOrder: 5
};

export const query = `
  query Query {
    landingPage(id: getContextValue("landingPageId", null)) {
      name
    }
    backUrl: url(routeId: "landingPageGrid")
  }
`;
