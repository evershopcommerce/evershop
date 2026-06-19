import { TableCell } from '@components/common/ui/Table.js';
import React from 'react';

interface CategoryNameRowProps {
  category: {
    editUrl: string;
    path: Array<{ name: string }>;
  };
}

export function CategoryNameRow({ category }: CategoryNameRowProps) {
  return (
    <TableCell>
      <div>
        <a className="hover:underline font-semibold" href={category.editUrl}>
          {category.path.map((p) => p.name).join(' / ')}
        </a>
      </div>
    </TableCell>
  );
}
