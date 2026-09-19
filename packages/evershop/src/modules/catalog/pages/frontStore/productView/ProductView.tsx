import Area from '@components/common/Area.js';
import {
  ProductData,
  ProductProvider
} from '@components/frontStore/catalog/ProductContext.js';
import React from 'react';

/**
 * Product page shell. It owns the product query, the `ProductProvider` and the
 * slots (Areas); the blocks are sibling page components that register into
 * those slots, so a theme can re-position them from `layouts.json` without
 * overriding this file:
 *
 *   productView/ProductMedia        → productPageMiddleLeft   0
 *   productView/ProductName         → productPageMiddleRight 10
 *   productView/ProductForm         → productPageMiddleRight 30  (buy box)
 *   productView/ProductPrice        → productSinglePageForm   5  (inside the buy box)
 *   productView/ProductAttributes   → productSinglePageForm   7  (inside the buy box)
 *   productView/ProductDescription  → productSingleDescription 10
 */
export default function ProductView({ product }: ProductData) {
  return (
    <ProductProvider product={product}>
      <div className="product__detail">
        <Area id="productPageTop" className="product__page__top" />
        <div className="product__page__middle">
          <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
            <Area
              id="productPageMiddleLeft"
              className="product__detail__left"
            />
            <Area
              id="productPageMiddleRight"
              className="product__detail__right"
            />
          </div>
          <Area id="productSingleDescription" />
        </div>
        <Area id="productPageBottom" className="product__page__bottom" />
      </div>
    </ProductProvider>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
query Query {
    product: currentProduct {
      uuid
      metafields {
        namespace
        key
        type
        value
      }
      name
      description
      metaTitle
      metaDescription
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
      attributes: attributeIndex {
        attributeName
        attributeCode
        optionText
      }
      image {
        alt
        url
      }
      gallery {
        alt
        url
      }
      variantGroup {
        variantAttributes {
          attributeId
          attributeCode
          attributeName
          options {
            optionId
            optionText
            productId
          }
        }
        items {
          attributes {
            attributeCode
            optionId
          }
        }
      }
    }
}`;
