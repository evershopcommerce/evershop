import { PageHeading } from '@components/admin/PageHeading.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export interface CustomerEditPageHeadingProps {
  backUrl: string;
  customer?: {
    fullName: string;
  } | null;
}

export default function CustomerEditPageHeading({
  backUrl,
  customer = null
}: CustomerEditPageHeadingProps) {
  return (
    <PageHeading
      backUrl={backUrl}
      heading={
        customer
          ? _('Editing ${fullName}', { fullName: customer.fullName })
          : _('Create A New Customer')
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
    customer(id: getContextValue("customerUuid", null)) {
      fullName
    }
    backUrl: url(routeId: "customerGrid")
  }
`;
