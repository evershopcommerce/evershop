import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

/**
 * Blog home block: the centered page title. A page component rather than markup inside the shell so a theme can move it from `layouts.json`;
 * it reads `BlogListProvider`, so it must stay inside the listing shell's Areas.
 */
export default function BlogHomeHeader(): React.ReactElement | null {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
        {_('Blog')}
      </h1>
    </div>
  );
}

export const layout = {
  areaId: 'blogListHeader',
  sortOrder: 10
};
