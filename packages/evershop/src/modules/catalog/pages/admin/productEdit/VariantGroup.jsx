import { New } from '@components/admin/catalog/productEdit/variants/New';
import { Variants } from '@components/admin/catalog/productEdit/variants/Variants';
import { Card } from '@components/admin/cms/Card';
import PropTypes from 'prop-types';
import React from 'react';

export default function VariantGroup({
  product,
  createVariantGroupApi,
  createProductApi,
  productImageUploadUrl
}) {
  const [group, setGroup] = React.useState(product?.variantGroup || null);
  return (
    <Card title="Variant">
      {!group && (
        <New
          createVariantGroupApi={createVariantGroupApi}
          setGroup={setGroup}
        />
      )}
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

VariantGroup.propTypes = {
  createProductApi: PropTypes.string.isRequired,
  createVariantGroupApi: PropTypes.string.isRequired,
  product: PropTypes.shape({
    productId: PropTypes.number.isRequired,
    uuid: PropTypes.string.isRequired,
    variantGroup: PropTypes.shape({
      variantGroupId: PropTypes.number.isRequired,
      addItemApi: PropTypes.string.isRequired,
      attributes: PropTypes.arrayOf(
        PropTypes.shape({
          attributeId: PropTypes.number.isRequired,
          attributeCode: PropTypes.string.isRequired,
          attributeName: PropTypes.string.isRequired,
          options: PropTypes.arrayOf(
            PropTypes.shape({
              optionId: PropTypes.number.isRequired,
              optionText: PropTypes.string.isRequired
            })
          ).isRequired
        })
      ).isRequired
    })
  }).isRequired,
  productImageUploadUrl: PropTypes.string.isRequired
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
  productImageUploadUrl: url(routeId: "imageUpload", params: [{key: "0", value: ""}])
}
`;
