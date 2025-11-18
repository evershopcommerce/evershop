import Area from '@components/common/Area.js';
import { useSearch } from '@components/frontStore/catalog/SearchContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export function SearchInfo() {
  const { keyword } = useSearch();

  return (
    <>
      <Area id="searchInfoBefore" noOuter />
      <div className="page-width">
        <div className="mb-2 md:mb-5">
          <div className="text-left ">
            <h1 className="search-name mt-6">
              {_('Search results for "${keyword}"', { keyword })}
            </h1>
          </div>
        </div>
      </div>
      <Area id="searchInfoAfter" noOuter />
    </>
  );
}
