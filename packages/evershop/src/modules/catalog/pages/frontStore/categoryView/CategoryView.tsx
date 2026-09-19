import Area from '@components/common/Area.js';
import {
  CategoryData,
  CategoryProvider
} from '@components/frontStore/catalog/CategoryContext.js';
import React from 'react';

interface CategoryViewProps {
  category: CategoryData;
}

/**
 * Category page shell. It owns the category query, the `CategoryProvider` and
 * the slots (Areas); the blocks are sibling page components that register into
 * those slots, so a theme can re-position them from `layouts.json` without
 * overriding this file:
 *
 *   categoryView/CategoryInfo        → categoryInfo        10  (name, description, image)
 *   categoryView/CategoryFilter      → categoryLeftColumn  10
 *   categoryView/CategorySorting     → categoryRightColumn 10
 *   categoryView/CategoryProducts    → categoryRightColumn 20
 *   categoryView/CategoryPagination  → categoryRightColumn 30
 */
export default function CategoryView({ category }: CategoryViewProps) {
  return (
    <CategoryProvider category={category}>
      <Area
        id="categoryPageTop"
        className="category__page__top"
        editableInPageBuilder
      />
      {/*
        `noOuter` is kept here deliberately. The drop zones come from the
        `editableInPageBuilder` prop and work without a wrapper; only the
        `data-evershop-editable-area` marker needs one, and adding a div around
        the category heading on a live page risks breaking theme CSS for an
        attribute nothing currently reads.
      */}
      <Area id="categoryInfo" noOuter editableInPageBuilder />
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[240px_1fr]">
        <Area
          id="categoryLeftColumn"
          className="category__left__column"
          editableInPageBuilder
        />
        <Area
          id="categoryRightColumn"
          className="category__right__column min-w-0"
          editableInPageBuilder
        />
      </div>
      <Area
        id="categoryPageBottom"
        className="category__page__bottom"
        editableInPageBuilder
      />
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
      metafields {
        namespace
        key
        type
        value
      }
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
