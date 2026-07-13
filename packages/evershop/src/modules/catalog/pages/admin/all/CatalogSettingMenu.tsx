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

interface CatalogSettingMenuProps {
  catalogSettingUrl: string;
}

export default function CatalogSettingMenu({
  catalogSettingUrl
}: CatalogSettingMenuProps) {
  const isActive =
    typeof window !== 'undefined' &&
    new URL(catalogSettingUrl, window.location.origin).pathname ===
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
              href={catalogSettingUrl}
              className={cn(
                'uppercase text-xs font-semibold',
                isActive && 'text-primary'
              )}
            >
              {_('Catalog')}
            </a>
          </div>
        </ItemTitle>
        <ItemDescription>
          <div>{_('Product listing and image settings')}</div>
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button
          variant="outline"
          size="sm"
          onClick={() => (window.location.href = catalogSettingUrl)}
        >
          <Settings className="h-4 w-4 mr-1" />
        </Button>
      </ItemActions>
    </Item>
  );
}

export const layout = {
  areaId: 'settingPageMenu',
  sortOrder: 7
};

export const query = `
  query Query {
    catalogSettingUrl: url(routeId: "catalogSetting")
  }
`;
