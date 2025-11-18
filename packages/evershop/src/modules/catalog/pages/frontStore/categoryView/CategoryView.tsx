import Area from '@components/common/Area.js';
import {
  CategoryData,
  CategoryProvider
} from '@components/frontStore/catalog/CategoryContext.js';
import { CategoryInfo } from '@components/frontStore/catalog/CategoryInfo.js';
import { CategoryProducts } from '@components/frontStore/catalog/CategoryProducts.js';
import { CategoryProductsFilter } from '@components/frontStore/catalog/CategoryProductsFilter.js';
import { CategoryProductsPagination } from '@components/frontStore/catalog/CategoryProductsPagination.js';
import { ProductSorting } from '@components/frontStore/catalog/ProductSorting.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface CategoryViewProps {
  category: CategoryData;
}

export default function CategoryView({ category }: CategoryViewProps) {
  return (
    <CategoryProvider category={category}>
      <Area id="categoryPageTop" className="category__page__top" />
      <CategoryInfo />
      <div className="page-width grid grid-cols-1 md:grid-cols-4 gap-5">
        <Area
          id="categoryLeftColumn"
          className="md:col-span-1"
          coreComponents={[
            {
              component: { default: <CategoryProductsFilter /> },
              sortOrder: 10,
              id: 'productFilter'
            }
          ]}
        />
        <Area
          id="categoryRightColumn"
          className="md:col-span-3"
          coreComponents={[
            {
              component: {
                default: (
                  <div className="flex justify-between items-center border-b border-gray-300 mb-8">
                    <div>
                      {_('${count} Products', {
                        count: category.products.total.toString()
                      })}
                    </div>
                    <ProductSorting className="flex justify-start" />
                  </div>
                )
              },
              sortOrder: 10,
              id: 'categoryProductsSorting'
            },
            {
              component: { default: <CategoryProducts /> },
              sortOrder: 20,
              id: 'categoryProducts'
            },
            {
              component: { default: <CategoryProductsPagination /> },
              sortOrder: 30,
              id: 'categoryProductsPagination'
            }
          ]}
        />
      </div>
      <Area id="categoryPageBottom" className="category__page__bottom" />
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
