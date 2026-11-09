import { NavigationItem } from '@components/admin/NavigationItem.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { UploadIcon } from 'lucide-react';
import React from 'react';

interface ImportQuickLinkProps {
  importGrid: string;
}

export default function ImportQuickLink({ importGrid }: ImportQuickLinkProps) {
  return (
    <NavigationItem Icon={UploadIcon} title={_('Import')} url={importGrid} />
  );
}

export const layout = {
  areaId: 'quickLinks',
  sortOrder: 40
};

export const query = `
  query Query {
    importGrid: url(routeId: "importGrid")
  }
`;
