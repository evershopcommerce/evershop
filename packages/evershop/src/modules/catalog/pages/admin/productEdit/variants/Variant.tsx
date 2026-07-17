import { ProductNoThumbnail } from '@components/common/ProductNoThumbnail.js';
import { Button } from '@components/common/ui/Button.js';
import { TableCell, TableRow } from '@components/common/ui/Table.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
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
    <TableRow>
      <TableCell>
        {variant.product?.image?.url ? (
          <img
            className="size-9 rounded-md border border-border object-cover"
            src={variant?.product?.image?.url}
            alt=""
          />
        ) : (
          <ProductNoThumbnail className="size-9 text-muted-foreground" />
        )}
      </TableCell>
      {variantGroup.attributes.map((a) => {
        const option = variant.attributes.find(
          (attr) => attr.attributeCode === a.attributeCode
        );
        return (
          <TableCell key={a.attributeId}>
            <label>{option?.optionText || '--'}</label>
          </TableCell>
        );
      })}
      <TableCell>
        <Button
          variant={'link'}
          className={'h-auto p-0 hover:cursor-pointer'}
          onClick={(e) => {
            e.preventDefault();
            window.location.href = variant.product.editUrl;
          }}
        >
          {variant.product?.sku}
        </Button>
      </TableCell>
      <TableCell>{variant.product?.price?.regular?.text}</TableCell>
      <TableCell>{variant.product?.inventory?.qty}</TableCell>
      <TableCell>
        {variant.product?.status === 1 ? (
          <span className="text-primary font-medium">{_('Enabled')}</span>
        ) : (
          <span className="text-destructive font-medium">{_('Disabled')}</span>
        )}
      </TableCell>
      <TableCell>
        <EditVariant
          variant={variant}
          refresh={refresh}
          variantGroup={variantGroup}
        />
      </TableCell>
    </TableRow>
  );
};
