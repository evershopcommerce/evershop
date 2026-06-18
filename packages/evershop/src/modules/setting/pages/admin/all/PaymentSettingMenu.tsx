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
import { Cog, Settings } from 'lucide-react';
import React from 'react';

interface PaymentSettingMenuProps {
  paymentSettingUrl: string;
}

export default function PaymentSettingMenu({
  paymentSettingUrl
}: PaymentSettingMenuProps) {
  const isActive =
    typeof window !== 'undefined' &&
    new URL(paymentSettingUrl, window.location.origin).pathname ===
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
              href={paymentSettingUrl}
              className={cn(
                'uppercase text-xs font-semibold',
                isActive && 'text-primary'
              )}
            >
              {_('Payment Setting')}
            </a>
          </div>
        </ItemTitle>
        <ItemDescription>
          <div>{_('Configure the available payment methods')}</div>
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button
          variant="outline"
          size="sm"
          onClick={() => (window.location.href = paymentSettingUrl)}
        >
          <Settings className="h-4 w-4 mr-1" />
        </Button>
      </ItemActions>
    </Item>
  );
}

export const layout = {
  areaId: 'settingPageMenu',
  sortOrder: 10
};

export const query = `
  query Query {
    paymentSettingUrl: url(routeId: "paymentSetting")
  }
`;
