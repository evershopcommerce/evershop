import { TableCell } from '@components/common/ui/Table.js';
import React from 'react';

interface PageNameProps {
  url: string;
  name: string;
}

export function PageName({ url, name }: PageNameProps) {
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
