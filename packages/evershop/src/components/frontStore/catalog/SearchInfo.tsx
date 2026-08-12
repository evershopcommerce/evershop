import Area from '@components/common/Area.js';
import { useSearch } from '@components/frontStore/catalog/SearchContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Search } from 'lucide-react';
import React from 'react';

export function SearchInfo() {
  const { keyword, products } = useSearch();
  const count = products?.total ?? 0;
  return (
    <>
      <Area id="searchInfoBefore" noOuter />
      {/* Inline search box (reference): a plain GET form that re-runs the
          existing /search route, so shoppers can refine without the header
          overlay. No new API — same `keyword` param the page already reads. */}
      <form action="/search" method="GET" className="mb-8 mt-2">
        <div className="relative mx-auto max-w-2xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="keyword"
            defaultValue={keyword}
            placeholder={_('Search products…')}
            aria-label={_('Search')}
            className="w-full rounded-lg border border-border bg-background py-3 pl-11 pr-4 text-sm outline-none transition-colors focus:border-foreground"
          />
        </div>
      </form>
      {/* Re-skin (2026-07-10): "N results for <query>" (reference). Content is
          already inside .page-width via Base, so no nested page-width here. */}
      <div className="mb-8">
        <h1 className="search-name text-2xl font-semibold tracking-tight">
          {count} {count === 1 ? _('result') : _('results')} {_('for')}{' '}
          <span className="text-muted-foreground">“{keyword}”</span>
        </h1>
      </div>
      <Area id="searchInfoAfter" noOuter />
    </>
  );
}
