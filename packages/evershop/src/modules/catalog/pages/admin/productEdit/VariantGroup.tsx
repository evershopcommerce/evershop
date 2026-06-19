import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { New } from './variants/New.js';
import { Variants } from './variants/Variants.js';

export interface VariantGroup {
  variantGroupId: number;
  addItemApi: string;
  attributes: Array<VariantAttribute>;
}

export interface VariantProduct {
  productId: number;
  uuid: string;
  variantGroup?: VariantGroup | null;
}

export interface VariantAttribute {
  attributeId: number;
  attributeCode: string;
  attributeName: string;
  options: Array<{
    optionId: number;
    optionText: string;
  }>;
}

export interface VariantGroupProps {
  product: VariantProduct;
  createVariantGroupApi: string;
  createProductApi: string;
}

const VariantGroup: React.FC<VariantGroupProps> = ({
  product,
  createVariantGroupApi,
  createProductApi
}) => {
  const [group, setGroup] = React.useState<VariantGroup | null>(
    product?.variantGroup || null
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>{_('Variant Group')}</CardTitle>
        <CardDescription>
          {_('Manage the variant group of the product.')}
        </CardDescription>
      </CardHeader>
      {!group && (
        <New
          currentProductUuid={product.uuid}
          createVariantGroupApi={createVariantGroupApi}
          setGroup={setGroup}
        />
      )}
      {group && (
        <Variants
          productId={product.productId}
          productUuid={product.uuid}
          variantGroup={group}
          createProductApi={createProductApi}
        />
      )}
    </Card>
  );
};

export const layout = {
  areaId: 'leftSide',
  sortOrder: 70
};

export const query = `
query Query {
  product(id: getContextValue('productId', null)) {
    productId
    uuid
    variantGroup {
      variantGroupId
      attributes: variantAttributes {
        attributeId
        attributeCode
        attributeName
        options {
          optionId
          optionText
        }
      }
      addItemApi
    }
  }
  createVariantGroupApi: url(routeId: "createVariantGroup")
  createProductApi: url(routeId: "createProduct")
}
`;

export default VariantGroup;
