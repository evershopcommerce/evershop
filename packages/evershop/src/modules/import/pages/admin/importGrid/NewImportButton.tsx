import { buttonVariants } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface NewImportButtonProps {
  newImportUrl: string;
}

export default function NewImportButton({
  newImportUrl
}: NewImportButtonProps) {
  return (
    <a className={buttonVariants()} href={newImportUrl}>
      {_('New import')}
    </a>
  );
}

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 10
};

export const query = `
  query Query {
    newImportUrl: url(routeId: "importNew")
  }
`;
