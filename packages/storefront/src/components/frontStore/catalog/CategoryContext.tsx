import { Row } from '@components/common/form/Editor.js';
import { ProductData } from '@components/frontStore/catalog/ProductContext.js';
import {
  CategoryFilter,
  FilterableAttribute,
  FilterInput
} from '@components/frontStore/catalog/ProductFilter.js';
import React, { createContext, useContext, ReactNode } from 'react';

export interface CategoryProducts {
  items: ProductData[];
  currentFilters: FilterInput[];
  total: number;
}

export interface CategoryData {
  categoryId: number;
  uuid: string;
  name: string;
  description: Array<Row>;
  url?: string;
  image?: {
    alt: string;
    url: string;
  };
  showProducts: boolean;
  products: CategoryProducts;
  availableAttributes: FilterableAttribute[];
  children: CategoryFilter[];
  priceRange: {
    min: number;
    minText: string;
    max: number;
    maxText: string;
  };
  [extendedFields: string]: any;
}

const CategoryContext = createContext<CategoryData | undefined>(undefined);

interface CategoryProviderProps {
  children: ReactNode;
  category: CategoryData;
}

export const CategoryProvider: React.FC<CategoryProviderProps> = ({
  children,
  category
}) => {
  return (
    <CategoryContext.Provider value={category}>
      {children}
    </CategoryContext.Provider>
  );
};

export const useCategory = (): CategoryData => {
  const context = useContext(CategoryContext);
  if (context === undefined) {
    throw new Error('useCategory must be used within a CategoryProvider');
  }
  return context;
};
