import Area from '@components/common/Area.js';
import { ProductAttributes } from '@components/frontStore/product/Attributes.js';
import { ProductDescription } from '@components/frontStore/product/Description.js';
import { Media } from '@components/frontStore/product/Media.js';
import { ProductName } from '@components/frontStore/product/Name.js';
import { ProductProvider } from '@components/frontStore/product/productContext.js';
import { ProductForm } from '@components/frontStore/product/ProductForm.js';
import { ProductSku } from '@components/frontStore/product/Sku.js';
import React from 'react';

export default function ProductView({ product }) {
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
                  component: { default: <ProductName /> },
                  sortOrder: 10,
                  id: 'name'
                },
                {
                  component: { default: <ProductAttributes /> },
                  sortOrder: 20,
                  id: 'attributes'
                },
                {
                  component: { default: <ProductForm /> },
                  sortOrder: 30,
                  id: 'productForm'
                }
              ]}
            />
          </div>
          <ProductDescription />
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
