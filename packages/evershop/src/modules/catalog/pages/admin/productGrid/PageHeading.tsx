import { PageHeading } from '@components/admin/PageHeading.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export interface ProductGridPageHeadingProps {
  backUrl: string;
  product?: {
    name?: string;
  };
}

export default function ProductEditPageHeading({
  backUrl,
  product
}: ProductGridPageHeadingProps) {
  return (
    <PageHeading
      backUrl={backUrl}
      heading={
        product
          ? _('Editing ${name}', { name: product.name ?? '' })
          : _('Create a new product')
      }
    />
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};
