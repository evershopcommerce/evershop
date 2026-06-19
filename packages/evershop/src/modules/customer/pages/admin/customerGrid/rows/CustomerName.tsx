import { TableCell } from '@components/common/ui/Table.js';
import React from 'react';

interface CustomerNameProps {
  name: string;
  url: string;
}

export function CustomerName({ url, name }: CustomerNameProps) {
  return (
    <TableCell>
      <div>
        <a className="hover:underline font-semibold" href={url}>
          {name}
        </a>
      </div>
    </TableCell>
  );
}
