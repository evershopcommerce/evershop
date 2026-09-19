import { Button } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface NewCollectionButtonProps {
  newCollectionUrl: string;
}
export default function NewCollectionButton({
  newCollectionUrl
}: NewCollectionButtonProps) {
  return (
    <Button onClick={() => (window.location.href = newCollectionUrl)}>
      {_('New Collection')}
    </Button>
  );
}

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 10
};

export const query = `
  query Query {
    newCollectionUrl: url(routeId: "collectionNew")
  }
`;
