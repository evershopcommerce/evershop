import React from 'react';
import { New } from './variants/New';
import { Edit } from './variants/Edit';
import { Card } from '../../../../cms/components/admin/Card';

export default function VariantGroup({ product }) {
  return (
    <Card
      title="Variant"
    >
      {!product?.variantGroup?.variantGroupId && <New />}
      {product?.variantGroup?.variantGroupId && (
        <div>
          <input type="hidden" value={product?.variantGroup?.variantGroupId} name="variant_group[variant_group_id]" />
          <Edit
            variantAttributes={product?.variantGroup?.variantAttributes || []}
            variants={product?.variantGroup?.items || []}
          />
        </div>
      )}
    </Card>
  );
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 70
}

export const query = `
query Query {
  product(id: getContextValue('productId', null)) {
    variantGroup {
      variantGroupId
      variantAttributes {
        attributeId
        attributeCode
        attributeName
        options {
          optionId
          optionText
        }
      }
      items {
        id
        attributes {
          attributeId
          attributeCode
          optionId
        }
        product {
          productId
          name
          sku
          status
          price {
            regular {
              value
              currency
            }
          }
          inventory {
            qty
            isInStock
            stockAvailability
            manageStock
          }
          editUrl
          image {
            uniqueId
            url: origin
            path
          }
          gallery {
            uniqueId
            url: origin
            path
          }
        }
      }
    }
  }
}
`;