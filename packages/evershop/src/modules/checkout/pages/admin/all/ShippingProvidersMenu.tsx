import { Button } from '@components/common/ui/Button.js';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle
} from '@components/common/ui/Item.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { cn } from '@evershop/evershop/lib/util/cn';
import { Truck } from 'lucide-react';
import React from 'react';

interface ShippingProvidersMenuProps {
  shippingProvidersUrl: string;
}

/**
 * Settings → Shipping Providers menu entry. Lives alongside the legacy
 * ShippingSettingMenu in `settingPageMenu` during phase 6. Phase 7 rebuilds
 * the zone admin behind the same URL; phase 8 removes the legacy entry.
 */
export default function ShippingProvidersMenu({
  shippingProvidersUrl
}: ShippingProvidersMenuProps) {
  const isActive =
    typeof window !== 'undefined' &&
    new URL(shippingProvidersUrl, window.location.origin).pathname ===
      window.location.pathname;

  return (
    <Item
      variant={'outline'}
      className={cn(
        isActive && 'bg-primary/5 border-primary/20 dark:bg-primary/10'
      )}
      data-active={isActive ? 'true' : 'false'}
    >
      <ItemContent>
        <ItemTitle>
          <div>
            <a
              href={shippingProvidersUrl}
              className={cn(
                'uppercase text-xs font-semibold',
                isActive && 'text-primary'
              )}
            >
              {_('Shipping Providers')}
            </a>
          </div>
        </ItemTitle>
        <ItemDescription>
          <div>
            {_(
              'Manage shipping integrations and their methods (Core, USPS, FedEx, …)'
            )}
          </div>
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button
          variant="outline"
          size="sm"
          onClick={() => (window.location.href = shippingProvidersUrl)}
        >
          <Truck className="h-4 w-4 mr-1" />
        </Button>
      </ItemActions>
    </Item>
  );
}

export const layout = {
  areaId: 'settingPageMenu',
  sortOrder: 16
};

export const query = `
  query Query {
    shippingProvidersUrl: url(routeId: "shippingProviders")
  }
`;
