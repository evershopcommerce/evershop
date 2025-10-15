import { ProductData } from '@components/frontStore/catalog/ProductContext.js';
import { FilterInput } from '@components/frontStore/catalog/ProductFilter.js';
import React, { createContext, useContext, ReactNode } from 'react';

export interface SearchProducts {
  items: ProductData[];
  currentFilters: FilterInput[];
  total: number;
}

export interface SearchPageData {
  keyword: string;
  url?: string;
  products: SearchProducts;
  [extendedFields: string]: any;
}

const SearchContext = createContext<SearchPageData | undefined>(undefined);

interface SearchProviderProps {
  children: ReactNode;
  searchData: SearchPageData;
}

export const SearchProvider: React.FC<SearchProviderProps> = ({
  children,
  searchData
}) => {
  return (
    <SearchContext.Provider value={searchData}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = (): SearchPageData => {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};
