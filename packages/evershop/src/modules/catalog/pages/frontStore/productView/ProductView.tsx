import Area from '@components/common/Area.js';
import { Media } from '@components/frontStore/catalog/Media.js';
import {
  ProductData,
  ProductProvider
} from '@components/frontStore/catalog/ProductContext.js';
import { ProductSingleAttributes } from '@components/frontStore/catalog/ProductSingleAttributes.js';
import { ProductSingleDescription } from '@components/frontStore/catalog/ProductSingleDescription.js';
import { ProductSingleForm } from '@components/frontStore/catalog/ProductSingleForm.js';
import { ProductSingleName } from '@components/frontStore/catalog/ProductSingleName.js';
import React from 'react';

export default function ProductView({ product }: ProductData) {
  return (
    <ProductProvider product={product}>
      <div className="product__detail">
        <Area id="productPageTop" className="product__page__top" />
        <div className="product__page__middle page-width">
          <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
            <Area
              id="productPageMiddleLeft"
              className="product__detail__left"
              coreComponents={[
                {
                  component: { default: <Media /> },
                  sortOrder: 0,
                  id: 'media'
                }
              ]}
            />
            <Area
              id="productPageMiddleRight"
              className="product__detail__right"
              coreComponents={[
                {
                  component: { default: <ProductSingleName /> },
                  sortOrder: 10,
                  id: 'name'
                },
                {
                  component: { default: <ProductSingleAttributes /> },
                  sortOrder: 20,
                  id: 'attributes'
                },
                {
                  component: { default: <ProductSingleForm /> },
                  sortOrder: 30,
                  id: 'productForm'
                }
              ]}
            />
          </div>
          <ProductSingleDescription />
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
      name
      description
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
