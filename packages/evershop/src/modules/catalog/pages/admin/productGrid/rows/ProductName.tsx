import { TableCell } from '@components/common/ui/Table.js';
import React from 'react';

export interface ProductNameRowProps {
  name: string;
  url: string;
}
export function ProductNameRow({ url, name }: ProductNameRowProps) {
  return (
    <TableCell>
      <div>
        <a className="hover:underline font-semibold" href={url} title={name}>
          {name.length > 50 ? `${name.substring(0, 50)}...` : name}
        </a>
      </div>
    </TableCell>
  );
}
