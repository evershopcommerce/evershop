import { TableCell } from '@components/common/ui/Table.js';
import React from 'react';

interface OrderNumberProps {
  editUrl: string;
  number: string;
}

export function OrderNumber({ editUrl, number }: OrderNumberProps) {
  return (
    <TableCell>
      <div>
        <a className="hover:underline font-semibold" href={editUrl}>
          #{number}
        </a>
      </div>
    </TableCell>
  );
}
