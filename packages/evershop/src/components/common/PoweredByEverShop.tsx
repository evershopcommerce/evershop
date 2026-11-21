import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { cn } from '@evershop/evershop/lib/util/cn';
import React from 'react';

/**
 * "Powered by EverShop", linking to the EverShop website in a new tab. The
 * storefront and admin footers show it next to the copyright line until the
 * store owner writes their own copyright text (`themeConfig.showPoweredBy`).
 * `utmSource` tells evershop.io which footer the visitor came from.
 */
export function PoweredByEverShop({
  utmSource,
  className
}: {
  utmSource: 'footer_store' | 'footer_admin';
  className?: string;
}) {
  return (
    <a
      href={`https://evershop.io/?utm_source=${utmSource}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('powered-by whitespace-nowrap', className)}
    >
      {_('Powered by EverShop')}
    </a>
  );
}
