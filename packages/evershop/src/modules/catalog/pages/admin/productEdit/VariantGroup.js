import React from 'react';
import { New } from './variants/New';
import { Card } from '../../../../cms/components/admin/Card';
import { Variants } from './variants/Variants';

export default function VariantGroup({
  product,
  createVariantGroupApi,
  createProductApi,
  productImageUploadUrl
}) {
  const [group, setGroup] = React.useState(product?.variantGroup || null);
  return (
    <Card
      title="Variant"
    >
      {!group && <New
        createVariantGroupApi={createVariantGroupApi}
        setGroup={setGroup}
      />}
      {group && (
        <Variants
          productId={product.productId}
          productUuid={product.uuid}
          variantGroup={group}
          variantAttributes={group.attributes}
          variantProducts={group.items || []}
          addVariantItemApi={group.addItemApi}
          createProductApi={createProductApi}
          productImageUploadUrl={productImageUploadUrl}
        />
      )}
    </Card>
  );
}

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
  productImageUploadUrl: url(routeId: "imageUpload", params: [{key: "0", value: ""}])
}
`;
