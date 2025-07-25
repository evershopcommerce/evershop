import React from 'react';
import { VariantGroup } from '../VariantGroup.js';
import { EditVariant } from './EditVariant.js';
import { VariantItem } from './Variants.js';

export const Variant: React.FC<{
  variant: VariantItem;
  refresh: () => void;
  variantGroup: VariantGroup;
}> = ({ variant, refresh, variantGroup }) => {
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
          refresh={refresh}
          variantGroup={variantGroup}
        />
      </td>
    </tr>
  );
};
