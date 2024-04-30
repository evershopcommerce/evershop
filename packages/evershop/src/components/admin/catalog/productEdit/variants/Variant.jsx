/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react';
import PropTypes from 'prop-types';
import { VariantType } from './VariantType';
import { EditVariant } from './EditVariant';

export function Variant({
  variant,
  productImageUploadUrl,
  refresh,
  variantGroup
}) {
  return (
    <tr>
      <td>
        <img
          style={{ maxWidth: '50px', height: 'auto' }}
          src={variant?.product?.image?.url}
          alt=""
        />
      </td>
      {variant.attributes.map((a) => (
        <td key={a.attributeId}>
          <label>{a.optionText || '--'}</label>
        </td>
      ))}
      <td>
        <a href={variant.product.editUrl} className="hover:text-interactive">
          {variant.product?.sku}
        </a>
      </td>
      <td>{variant.product?.price?.regular?.text}</td>
      <td>{variant.product?.inventory?.qty}</td>
      <td>
        {variant.product?.status === 1 ? (
          <span className="text-success">Enabled</span>
        ) : (
          <span className="text-critical">Disabled</span>
        )}
      </td>
      <td>
        <EditVariant
          variant={variant}
          productImageUploadUrl={productImageUploadUrl}
          refresh={refresh}
          variantGroup={variantGroup}
        />
      </td>
    </tr>
  );
}

Variant.propTypes = {
  variant: VariantType.isRequired,
  productImageUploadUrl: PropTypes.string.isRequired,
  refresh: PropTypes.func.isRequired,
  variantGroup: PropTypes.shape({
    attributes: PropTypes.arrayOf(
      PropTypes.shape({
        attributeId: PropTypes.number.isRequired,
        attributeName: PropTypes.string.isRequired,
        attributeCode: PropTypes.string.isRequired,
        options: PropTypes.arrayOf(
          PropTypes.shape({
            optionId: PropTypes.number.isRequired,
            optionText: PropTypes.string.isRequired
          })
        ).isRequired
      })
    ).isRequired
  }).isRequired
};
