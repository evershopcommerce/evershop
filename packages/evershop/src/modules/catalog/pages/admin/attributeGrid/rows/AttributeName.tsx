import { TableCell } from '@components/common/ui/Table.js';
import React from 'react';

interface AttributeNameRowProps {
  url: string;
  name: string;
}

export function AttributeNameRow({ url, name }: AttributeNameRowProps) {
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
