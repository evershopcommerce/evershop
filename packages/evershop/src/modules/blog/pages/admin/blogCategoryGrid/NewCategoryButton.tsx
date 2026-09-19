import { Button } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface NewCategoryButtonProps {
  newCategoryUrl: string;
}

export default function NewCategoryButton({
  newCategoryUrl
}: NewCategoryButtonProps) {
  return (
    <Button onClick={() => (window.location.href = newCategoryUrl)}>
      {_('New category')}
    </Button>
  );
}

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 10
};

export const query = `
  query Query {
    newCategoryUrl: url(routeId: "blogCategoryNew")
  }
`;
