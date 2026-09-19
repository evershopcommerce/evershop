import { TableCell } from '@components/common/ui/Table.js';
import React from 'react';

export function DummyColumnHeader({ title }: { title: string }) {
  return (
    <TableCell>
      <div className="font-medium uppercase text-xs">
        <span>{title}</span>
      </div>
    </TableCell>
  );
}
