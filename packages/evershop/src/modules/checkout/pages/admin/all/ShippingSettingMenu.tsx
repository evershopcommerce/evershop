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
import { Settings } from 'lucide-react';
import React from 'react';

interface ShippingSettingMenuProps {
  shippingSettingUrl: string;
}
export default function ShippingSettingMenu({
  shippingSettingUrl
}: ShippingSettingMenuProps) {
  const isActive =
    typeof window !== 'undefined' &&
    new URL(shippingSettingUrl, window.location.origin).pathname ===
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
              href={shippingSettingUrl}
              className={cn(
                'uppercase text-xs font-semibold',
                isActive && 'text-primary'
              )}
            >
              {_('Shipping Setting')}
            </a>
          </div>
        </ItemTitle>
        <ItemDescription>
          <div>{_('Where you ship, shipping methods and delivery fee')}</div>
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button
          variant="outline"
          size="sm"
          onClick={() => (window.location.href = shippingSettingUrl)}
        >
          <Settings className="h-4 w-4 mr-1" />
        </Button>
      </ItemActions>
    </Item>
  );
}

export const layout = {
  areaId: 'settingPageMenu',
  sortOrder: 15
};

export const query = `
  query Query {
    shippingSettingUrl: url(routeId: "shippingSetting")
  }
`;
