import { Badge, badgeVariants } from '@components/common/ui/Badge.js';
import { TableCell } from '@components/common/ui/Table.js';
import React from 'react';

interface PaymentStatusProps {
  status: {
    name: string;
    badge: keyof typeof badgeVariants;
  };
}

export function PaymentStatus({ status }: PaymentStatusProps) {
  return (
    <TableCell>
      <Badge variant={status.badge || 'default'}>{status.name}</Badge>
    </TableCell>
  );
}
