import { Card } from '@components/admin/Card.js';
import { Image } from '@components/admin/ImageUploader.js';
import React from 'react';
import { useQuery } from 'urql';
import { VariantGroup } from '../VariantGroup.js';
import { CreateVariant } from './CreateVariant.js';
import { Skeleton } from './Skeleton.js';
import { Variant } from './Variant.js';

export const VariantQuery = `
query Query($productId: ID!) {
  product(id: $productId) {
    variantGroup {
      items {
        id
        attributes {
          attributeId
          attributeCode
          optionId
          optionText
        }
        product {
          productId
          uuid
          name
          sku
          qty
          status
          urlKey
          visibility
          price {
            regular {
              value
              currency
              text
            }
          }
          inventory {
            qty
            isInStock
            stockAvailability
            manageStock
          }
          editUrl
          updateApi
          image {
            uuid
            url
          }
          gallery {
            uuid
            url
          }
        }
      }
    }
  }
}
`;

export interface VariantsProps {
  productId: number;
  productUuid: string;
  variantGroup: VariantGroup;
  createProductApi: string;
}

export interface VariantItem {
  id: number;
  attributes: Array<{
    attributeId: number;
    attributeCode: string;
    optionId: number;
    optionText: string;
  }>;
  product: {
    productId: number;
    uuid: string;
    name: string;
    sku: string;
    qty: number;
    status: number;
    visibility: number;
    price: {
      regular: {
        value: number;
        currency: string;
        text: string;
      };
    };
    inventory: {
      qty: number;
      isInStock: boolean;
      stockAvailability: string;
      manageStock: boolean;
    };
    urlKey: string;
    editUrl: string;
    updateApi: string;
    image: Image;
    gallery: Array<Image>;
  };
}

export const Variants: React.FC<VariantsProps> = ({
  productId,
  variantGroup,
  createProductApi
}) => {
  const [result, reexecuteQuery] = useQuery({
    query: VariantQuery,
    variables: {
      productId
    }
  });

  const refresh = () => {
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const { data, fetching, error } = result as {
    data: {
      product: {
        variantGroup: {
          items: Array<VariantItem>;
        };
      };
    };
    fetching: boolean;
    error: Error | null;
  };
  if (fetching) {
    return (
      <div className="p-2 flex justify-center items-center">
        <Skeleton />
      </div>
    );
  }

  if (error) {
    return <p className="text-critical">{error.message}</p>;
  }

  return (
    <Card.Session>
      <div className="variant-list overflow-x-scroll">
        <table>
          <thead>
            <tr>
              <th>Image</th>
              {variantGroup.attributes.map((attribute) => (
                <th key={attribute.attributeId}>{attribute.attributeName}</th>
              ))}
              <th>SKU</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data.product.variantGroup?.items || [])
              .filter((v) => v.product.productId !== productId)
              .map((v) => (
                <Variant
                  key={v.id}
                  variant={v}
                  refresh={refresh}
                  variantGroup={variantGroup}
                />
              ))}
          </tbody>
        </table>
      </div>
      <div className="self-center">
        <CreateVariant
          variantGroup={variantGroup}
          createProductApi={createProductApi}
          refresh={refresh}
        />
      </div>
    </Card.Session>
  );
};
