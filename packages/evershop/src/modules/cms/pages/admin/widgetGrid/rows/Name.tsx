import { TableCell } from '@components/common/ui/Table.js';
import React from 'react';

interface NameProps {
  url: string;
  name: string;
}

export function Name({ url, name }: NameProps) {
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
