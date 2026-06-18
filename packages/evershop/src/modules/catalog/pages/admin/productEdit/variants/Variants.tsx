import { Image } from '@components/admin/ImageUploader.js';
import { CardContent } from '@components/common/ui/Card.js';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow
} from '@components/common/ui/Table.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
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
    return <p className="text-destructive">{error.message}</p>;
  }

  return (
    <CardContent>
      <div className="variant-list overflow-x-scroll">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{_('Image')}</TableHead>
              {variantGroup.attributes.map((attribute) => (
                <TableHead key={attribute.attributeId}>
                  {attribute.attributeName}
                </TableHead>
              ))}
              <TableHead>{_('Sku')}</TableHead>
              <TableHead>{_('Price')}</TableHead>
              <TableHead>{_('Stock')}</TableHead>
              <TableHead>{_('Status')}</TableHead>
              <TableHead>{_('Actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
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
          </TableBody>
        </Table>
      </div>
      <div className="self-center">
        <CreateVariant
          variantGroup={variantGroup}
          createProductApi={createProductApi}
          refresh={refresh}
        />
      </div>
    </CardContent>
  );
};
