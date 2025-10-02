import { SearchBox as Search } from '@components/frontStore/catalog/SearchBox.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface SearchBoxProps {
  searchPageUrl: string;
}
export default function SearchBox({ searchPageUrl }: SearchBoxProps) {
  return (
    <Search searchPageUrl={searchPageUrl} enableAutocomplete maxResults={10} />
  );
}

export const layout = {
  areaId: 'headerMiddleRight',
  sortOrder: 5
};

export const query = `
  query Query {
    searchPageUrl: url(routeId: "catalogSearch")
  }
`;
