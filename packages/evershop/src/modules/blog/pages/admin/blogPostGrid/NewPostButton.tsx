import { Button } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface NewPostButtonProps {
  newPostUrl: string;
}

export default function NewPostButton({ newPostUrl }: NewPostButtonProps) {
  return (
    <Button onClick={() => (window.location.href = newPostUrl)}>
      {_('New post')}
    </Button>
  );
}

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 10
};

export const query = `
  query Query {
    newPostUrl: url(routeId: "blogPostNew")
  }
`;
