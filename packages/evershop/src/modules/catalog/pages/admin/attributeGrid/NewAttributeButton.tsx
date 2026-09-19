import { Button } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface NewAttributeButtonProps {
  newAttributeUrl: string;
}
export default function NewAttributeButton({
  newAttributeUrl
}: NewAttributeButtonProps) {
  return (
    <Button onClick={() => (window.location.href = newAttributeUrl)}>
      {_('New Attribute')}
    </Button>
  );
}

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 10
};

export const query = `
  query Query {
    newAttributeUrl: url(routeId: "attributeNew")
  }
`;
