import { Badge, BadgeProps } from '@components/admin/Badge.js';
import React from 'react';

interface ShipmentStatusProps {
  status: {
    name: string;
    badge: BadgeProps['variant'];
    progress: BadgeProps['progress'];
  };
}

export function ShipmentStatus({ status }: ShipmentStatusProps) {
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
