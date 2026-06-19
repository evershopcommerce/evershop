import { TableCell } from '@components/common/ui/Table.js';
import React from 'react';

interface CollectionNameRowProps {
  name: string;
  url: string;
}

export function CollectionNameRow({ name, url }: CollectionNameRowProps) {
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
