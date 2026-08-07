import { Dot } from '@components/admin/Dot.js';
import React from 'react';

export interface StatusProps {
  status: number;
}
export function Status({ status }: StatusProps) {
  return (
    <td>
      <div>
        {status === 0 && <Dot variant="default" size="1rem" />}
        {status === 1 && <Dot variant="success" size="1rem" />}
      </div>
    </td>
  );
}
