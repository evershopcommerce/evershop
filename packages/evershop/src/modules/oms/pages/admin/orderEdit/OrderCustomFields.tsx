import { StandaloneMetafieldCard } from '@components/admin/metafield/StandaloneMetafieldCard.js';
import React from 'react';

export default function OrderCustomFields({
  order,
  setting
}: {
  order?: {
    metaData?: Record<string, unknown>;
    updateMetafieldsApi?: string;
  } | null;
  setting?: { storeCurrency?: string } | null;
}): React.ReactElement | null {
  // The order admin screen is a read-only view, so the metafield editor is a
  // self-contained card that PATCHes to `updateMetafieldsApi` on Save.
  if (!order?.updateMetafieldsApi) return null;
  return (
    <StandaloneMetafieldCard
      ownerType="order"
      values={order.metaData}
      currency={setting?.storeCurrency ?? 'USD'}
      saveUrl={order.updateMetafieldsApi}
    />
  );
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 25
};

// `metaData` is admin-only; `storeCurrency` (= shop.currency) drives `money`
// fields. The order is loaded by uuid (context key "orderId").
export const query = `
  query Query {
    order(uuid: getContextValue("orderId")) {
      metaData
      updateMetafieldsApi
    }
    setting {
      storeCurrency
    }
  }
`;
