import {
  ProductFilter,
  DefaultProductFilterRenderer,
  FilterableAttribute,
  FilterInput,
  CategoryFilter
} from '@components/frontStore/ProductFilter.js';
import React from 'react';
import { _ } from '../../../../../lib/locale/translate/_.js';

interface FilterProps {
  category: {
    products: {
      currentFilters: FilterInput[];
    };
    availableAttributes: FilterableAttribute[];
    children: CategoryFilter[];
    priceRange: {
      min: number;
      max: number;
    };
  };
  setting: {
    storeLanguage: string;
    storeCurrency: string;
  };
}

export default function Filter({
  category: {
    products: { currentFilters },
    availableAttributes,
    children,
    priceRange
  },
  setting
}: FilterProps) {
  return (
    <ProductFilter
      currentFilters={currentFilters}
      availableAttributes={availableAttributes}
      categories={children}
      priceRange={priceRange}
      setting={setting}
    >
      {(renderProps) => (
        <DefaultProductFilterRenderer
          renderProps={renderProps}
          title="Product Filters"
          className="my-custom-class"
          showFilterSummary={true}
        />
      )}
    </ProductFilter>
  );
}

export const layout = {
  areaId: 'leftColumn',
  sortOrder: 1
};

export const query = `
query Query {
  category: currentCategory {
    products {
      currentFilters {
        key
        operation
        value
      }
    }
    availableAttributes {
      attributeCode
      attributeName
      options {
        optionId
        optionText
      }
    }
    priceRange {
      min
      max
    }
    children {
      categoryId,
      name
      uuid
    }
  }
  setting {
    storeLanguage
    storeCurrency
  }
}`;
