import { Button } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface NewTagButtonProps {
  newTagUrl: string;
}

export default function NewTagButton({ newTagUrl }: NewTagButtonProps) {
  return (
    <Button onClick={() => (window.location.href = newTagUrl)}>
      {_('New tag')}
    </Button>
  );
}

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 10
};

export const query = `
  query Query {
    newTagUrl: url(routeId: "blogTagNew")
  }
`;
