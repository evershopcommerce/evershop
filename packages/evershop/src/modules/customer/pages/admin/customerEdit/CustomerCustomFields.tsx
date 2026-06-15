import { StandaloneMetafieldCard } from '@components/admin/metafield/StandaloneMetafieldCard.js';
import React from 'react';

export default function CustomerCustomFields({
  customer,
  setting
}: {
  customer?: {
    metaData?: Record<string, unknown>;
    updateMetafieldsApi?: string;
  } | null;
  setting?: { storeCurrency?: string } | null;
}): React.ReactElement | null {
  // The customer admin screen is a read-only view, so the metafield editor is a
  // self-contained card that PATCHes to `updateMetafieldsApi` on Save.
  if (!customer?.updateMetafieldsApi) return null;
  return (
    <StandaloneMetafieldCard
      ownerType="customer"
      values={customer.metaData}
      currency={setting?.storeCurrency ?? 'USD'}
      saveUrl={customer.updateMetafieldsApi}
    />
  );
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 80
};

// Edit-only (customerEdit route); `metaData` is admin-only, `storeCurrency`
// (= shop.currency) drives `money` fields.
export const query = `
  query Query {
    customer(id: getContextValue("customerUuid", null)) {
      metaData
      updateMetafieldsApi
    }
    setting {
      storeCurrency
    }
  }
`;
