import { Button } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface NewLandingPageButtonProps {
  newLandingPageUrl: string;
}

export default function NewLandingPageButton({
  newLandingPageUrl
}: NewLandingPageButtonProps) {
  return (
    <Button
      onClick={() => (window.location.href = newLandingPageUrl)}
      title={_('New Landing Page')}
    >
      {' '}
      {_('New Landing Page')}{' '}
    </Button>
  );
}

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 10
};

export const query = `
  query Query {
    newLandingPageUrl: url(routeId: "landingPageNew")
  }
`;
