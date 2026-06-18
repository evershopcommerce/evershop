import { Badge } from '@components/common/ui/Badge.js';
import { TableCell } from '@components/common/ui/Table.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export interface StatusProps {
  status: number;
}
export function Status({ status }: StatusProps) {
  return (
    <TableCell>
      <div>
        {status === 0 && <Badge variant="destructive">{_('Inactive')}</Badge>}
        {status === 1 && <Badge variant="success">{_('Active')}</Badge>}
      </div>
    </TableCell>
  );
}
