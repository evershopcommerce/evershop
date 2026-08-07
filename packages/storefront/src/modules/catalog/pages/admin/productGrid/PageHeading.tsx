import { PageHeading } from '@components/admin/PageHeading.js';
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
      heading={product ? `Editing ${product.name}` : 'Create a new product'}
    />
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};
