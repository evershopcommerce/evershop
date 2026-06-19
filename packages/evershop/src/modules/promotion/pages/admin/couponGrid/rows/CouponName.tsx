import { TableCell } from '@components/common/ui/Table.js';
import React from 'react';

interface CouponNameProps {
  name: string;
  url: string;
}

export function CouponName({ url, name }: CouponNameProps) {
  return (
    <TableCell>
      <a className="hover:underline font-semibold" href={url}>
        {name}
      </a>
    </TableCell>
  );
}
