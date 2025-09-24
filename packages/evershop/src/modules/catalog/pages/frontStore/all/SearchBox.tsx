import { SearchBox as Search } from '@components/frontStore/catalog/SearchBox.js';
import React from 'react';
import { _ } from '../../../../../lib/locale/translate/_.js';

interface SearchBoxProps {
  searchPageUrl: string;
}
export default function SearchBox({ searchPageUrl }: SearchBoxProps) {
  return (
    <Search searchPageUrl={searchPageUrl} enableAutocomplete maxResults={10} />
  );
}

export const layout = {
  areaId: 'header',
  sortOrder: 5
};

export const query = `
  query Query {
    searchPageUrl: url(routeId: "catalogSearch")
  }
`;
