import Area from '@components/common/Area.js';
import {
  CategoryData,
  CategoryProvider
} from '@components/frontStore/category/categoryContext.js';
import { CategoryInfo } from '@components/frontStore/category/CategoryInfo.js';
import { Filter } from '@components/frontStore/category/Filter.js';
import { PaginationWrapper } from '@components/frontStore/category/Pagination.js';
import { Products } from '@components/frontStore/category/Products.js';
import { ProductSorting } from '@components/frontStore/ProductSorting.js';
import React from 'react';

interface CategoryViewProps {
  category: CategoryData;
}

export default function CategoryView({ category }: CategoryViewProps) {
  return (
    <CategoryProvider category={category}>
      <CategoryInfo />
      <div className="page-width grid grid-cols-1 md:grid-cols-4 gap-5">
        <Area
          id="leftColumn"
          className="md:col-span-1"
          coreComponents={[
            {
              component: { default: <Filter /> },
              sortOrder: 10,
              id: 'productFilter'
            }
          ]}
        />
        <Area
          id="rightColumn"
          className="md:col-span-3"
          coreComponents={[
            {
              component: { default: <Products /> },
              sortOrder: 10,
              id: 'categoryProducts'
            },
            {
              component: { default: <PaginationWrapper /> },
              sortOrder: 20,
              id: 'categoryProductsPagination'
            },
            {
              component: { default: <ProductSorting /> },
              sortOrder: 30,
              id: 'categoryProductsSorting'
            }
          ]}
        />
      </div>
    </CategoryProvider>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    category: currentCategory {
      showProducts
      name
      uuid
      description
      image {
        alt
        url
      }
      products {
        items {
          ...Product
        }
        currentFilters {
          key
          operation
          value
        }
        total
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
        minText
        maxText
      }
      children {
        categoryId,
        name
        uuid
      }
    }
}`;

export const fragments = `
  fragment Product on Product {
    productId
    name
    sku
    price {
      regular {
        value
        text
      }
      special {
        value
        text
      }
    }
    inventory {
      isInStock
    }
    image {
      alt
      url
    }
    url
  }
`;
