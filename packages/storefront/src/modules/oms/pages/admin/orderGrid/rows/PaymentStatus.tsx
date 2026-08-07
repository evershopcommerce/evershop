import { Badge, BadgeProps } from '@components/admin/Badge.js';
import React from 'react';

interface PaymentStatusProps {
  status: {
    name: string;
    badge: BadgeProps['variant'];
    progress: BadgeProps['progress'];
  };
}
export function PaymentStatus({ status }: PaymentStatusProps) {
  return (
    <td>
      <Badge
        title={status.name}
        variant={status.badge}
        progress={status.progress}
      />
    </td>
  );
}
