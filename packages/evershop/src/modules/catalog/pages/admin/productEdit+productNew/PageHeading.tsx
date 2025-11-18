import { PageHeading } from '@components/admin/PageHeading.js';
import React from 'react';

export interface ProductEditPageHeadingProps {
  backUrl: string;
  product?: {
    name?: string;
  };
}

export default function ProductEditPageHeading({
  backUrl,
  product
}: ProductEditPageHeadingProps) {
  return (
    <PageHeading
      backUrl={backUrl}
      heading={product ? `Editing ${product.name}` : 'Create a new product'}
    />
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 5
};

export const query = `
  query Query {
    product(id: getContextValue("productId", null)) {
      name
    }
    backUrl: url(routeId: "productGrid")
  }
`;
