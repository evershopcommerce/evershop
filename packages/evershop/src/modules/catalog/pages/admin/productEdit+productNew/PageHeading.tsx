import { PageHeading } from '@components/admin/PageHeading.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
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
