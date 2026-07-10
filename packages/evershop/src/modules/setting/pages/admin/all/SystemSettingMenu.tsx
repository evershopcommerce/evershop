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

interface SystemSettingMenuProps {
  systemSettingUrl: string;
}

export default function SystemSettingMenu({
  systemSettingUrl
}: SystemSettingMenuProps) {
  const isActive =
    typeof window !== 'undefined' &&
    new URL(systemSettingUrl, window.location.origin).pathname ===
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
              href={systemSettingUrl}
              className={cn(
                'uppercase text-xs font-semibold',
                isActive && 'text-primary'
              )}
            >
              {_('System Setting')}
            </a>
          </div>
        </ItemTitle>
        <ItemDescription>
          <div>{_('File storage and service credentials')}</div>
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button
          variant="outline"
          size="sm"
          onClick={() => (window.location.href = systemSettingUrl)}
        >
          <Settings className="h-4 w-4 mr-1" />
        </Button>
      </ItemActions>
    </Item>
  );
}

export const layout = {
  areaId: 'settingPageMenu',
  sortOrder: 30
};

export const query = `
  query Query {
    systemSettingUrl: url(routeId: "systemSetting")
  }
`;
