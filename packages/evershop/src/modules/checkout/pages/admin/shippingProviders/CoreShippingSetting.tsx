import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { MethodsList } from './coreShipping/MethodsList.js';

/**
 * Core provider section on the Shipping Providers settings page — the
 * built-in method/rate management that used to live on its own
 * `/setting/shippingProviders/core` page, now one section among the
 * providers (same one-section-per-provider layout as Payment settings).
 * Pure CRUD UI (its own dialogs/APIs) — registers no fields into the
 * surrounding settings form.
 */
export default function CoreShippingSetting() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{_('Core Shipping')}</CardTitle>
        <CardDescription>
          {_(
            'Built-in shipping methods with per-zone rates. Attach Core to a zone first under Settings → Shipping; then add methods here and configure their rates per zone.'
          )}
        </CardDescription>
      </CardHeader>
      <MethodsList />
    </Card>
  );
}

export const layout = {
  areaId: 'shippingProviderSetting',
  sortOrder: 5
};
