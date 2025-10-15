import { Row } from '@components/common/form/Editor.js';
import React, { createContext, useContext, ReactNode } from 'react';

export interface ProductPrice {
  value: number;
  text: string;
}

export interface ProductPriceData {
  regular: ProductPrice;
  special?: ProductPrice;
}

export interface AttributeOption {
  optionId: number;
  optionText: string;
  productId?: number;
}

export interface VariantAttribute {
  attributeId: number;
  attributeCode: string;
  attributeName: string;
  options: AttributeOption[];
}

export interface ImageData {
  url: string;
  alt?: string;
}

export interface AttributeIndexItem {
  attributeName: string;
  attributeCode: string;
  optionId: number;
  optionText: string;
}

export interface VariantGroup {
  variantAttributes: VariantAttribute[];
  items: {
    attributes: {
      attributeCode: string;
      optionId: number;
    }[];
    product?: {
      productId: number;
      name: string;
      sku: string;
      url: string;
      price: ProductPriceData;
      image?: ImageData;
    };
  }[];
}

export interface ProductData {
  productId: number;
  uuid: string;
  name: string;
  description: Array<Row>;
  sku: string;
  price: ProductPriceData;
  inventory: {
    isInStock: boolean;
  };
  weight?: {
    value: number;
    unit: string;
  };
  url?: string;
  image?: ImageData;
  gallery?: ImageData[];
  attributes?: AttributeIndexItem[];
  variantGroup?: VariantGroup;
  [extendedFields: string]: any;
}

const ProductContext = createContext<ProductData | undefined>(undefined);

interface ProductProviderProps {
  children: ReactNode;
  product: ProductData;
}

export const ProductProvider: React.FC<ProductProviderProps> = ({
  children,
  product
}) => {
  return (
    <ProductContext.Provider value={product}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProduct = (): ProductData => {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProduct must be used within a ProductProvider');
  }
  return context;
};
