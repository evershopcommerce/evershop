import { TableCell } from '@components/common/ui/Table.js';
import React from 'react';
import { ItemVariantOptions } from './ItemVariantOptions.js';

interface NameProps {
  name: string;
  productSku: string;
  productUrl: string;
  variantOptions?: Array<{
    attributeName: string;
    optionText: string;
  }>;
}

export function Name({
  name,
  productSku,
  productUrl,
  variantOptions = []
}: NameProps) {
  const truncatedName = name.length > 30 ? `${name.substring(0, 30)}...` : name;

  return (
    <TableCell className="w-auto min-w-0">
      <div className="product-column overflow-hidden">
        <div>
          <span className="font-semibold">
            <a href={productUrl} title={name}>
              {truncatedName}
            </a>
          </span>
        </div>
        <div className="text-muted-foreground">
          <span className="font-semibold">SKU: </span>
          <span>{productSku}</span>
        </div>
        <ItemVariantOptions options={variantOptions} />
      </div>
    </TableCell>
  );
}
