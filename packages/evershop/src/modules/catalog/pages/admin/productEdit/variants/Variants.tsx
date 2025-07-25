import { Card } from '@components/admin/Card.js';
import { Image } from '@components/admin/ImageUploader.js';
import Spinner from '@components/admin/Spinner.js';
import React from 'react';
import { useQuery } from 'urql';
import { VariantGroup, VariantAttribute } from '../VariantGroup.js';
import { CreateVariant } from './CreateVariant.js';
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
          status
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
  addVariantItemApi: string;
  variantAttributes: Array<VariantAttribute>;
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
    editUrl: string;
    updateApi: string;
    image: Image;
    gallery: Array<Image>;
  };
}

export const Variants: React.FC<VariantsProps> = ({
  productId,
  productUuid,
  variantGroup,
  variantAttributes,
  createProductApi,
  addVariantItemApi
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
      <div className="p-3 flex justify-center items-center">
        <Spinner width={30} height={30} />
      </div>
    );
  }

  if (error) {
    return (
      <p>
        Oh no...
        {error.message}
      </p>
    );
  }

  return (
    <Card.Session>
      <div className="variant-list">
        <table>
          <thead>
            <tr>
              <th>Image</th>
              {variantAttributes.map((attribute) => (
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
          productId={productUuid}
          variantGroup={variantGroup}
          createProductApi={createProductApi}
          addVariantItemApi={addVariantItemApi}
          refresh={refresh}
        />
      </div>
    </Card.Session>
  );
};
