import { ProductData } from '@components/frontStore/catalog/ProductContext.js';
import {
  FilterableAttribute,
  FilterInput,
  PriceRange
} from '@components/frontStore/catalog/ProductFilter.js';
import React, { createContext, useContext, ReactNode } from 'react';

export interface ProductListingProducts {
  items: ProductData[];
  currentFilters: FilterInput[];
  total: number;
}

/** A category from the flattened tree; `depth` drives indentation in the facet. */
export interface ListingCategoryNode {
  categoryId: number;
  uuid: string;
  name: string;
  depth: number;
}

export interface ProductListingData {
  products: ProductListingProducts;
  availableAttributes: FilterableAttribute[];
  priceRange: PriceRange;
  categories: ListingCategoryNode[];
  [extendedFields: string]: any;
}

const ProductListingContext = createContext<ProductListingData | undefined>(
  undefined
);

interface ProductListingProviderProps {
  children: ReactNode;
  listing: ProductListingData;
}

export const ProductListingProvider: React.FC<ProductListingProviderProps> = ({
  children,
  listing
}) => {
  return (
    <ProductListingContext.Provider value={listing}>
      {children}
    </ProductListingContext.Provider>
  );
};

export const useProductListing = (): ProductListingData => {
  const context = useContext(ProductListingContext);
  if (context === undefined) {
    throw new Error(
      'useProductListing must be used within a ProductListingProvider'
    );
  }
  return context;
};
