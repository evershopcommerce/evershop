import { SearchInfo } from '@components/frontStore/catalog/SearchInfo.js';
import React from 'react';

/**
 * Search page block: the heading with the keyword and the result count. A page component rather than markup inside the `SearchPage` shell so a theme can move it from
 * `layouts.json`; it reads `SearchProvider`, so it must stay inside the search shell's Areas.
 */
export default function SearchInfoBlock(): React.ReactElement | null {
  return <SearchInfo />;
}

export const layout = {
  areaId: 'searchPageContent',
  sortOrder: 10
};
