import { PageHeading } from '@components/admin/PageHeading.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export interface ProductEditPageHeadingProps {
  backUrl: string;
  product?: {
    name?: string;
  };
  duplicateSource?: {
    productId: number;
  } | null;
}

export default function ProductEditPageHeading({
  backUrl,
  product,
  duplicateSource
}: ProductEditPageHeadingProps) {
  // On productNew?duplicate=<uuid> the product prefills from the source, so
  // the plain "product exists → Editing" branch would mislead — this page
  // creates a new product.
  let heading = _('Create a new product');
  if (duplicateSource) {
    heading = _('Duplicating ${name}', { name: product?.name ?? '' });
  } else if (product) {
    heading = _('Editing ${name}', { name: product.name ?? '' });
  }
  return <PageHeading backUrl={backUrl} heading={heading} />;
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
    duplicateSource: product(id: getContextValue("duplicateSourceId", null)) {
      productId
    }
    backUrl: url(routeId: "productGrid")
  }
`;
