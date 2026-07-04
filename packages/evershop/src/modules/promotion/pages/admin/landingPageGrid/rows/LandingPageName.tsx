import { TableCell } from '@components/common/ui/Table.js';
import React from 'react';

interface LandingPageNameProps {
  name: string;
  url: string;
}

export function LandingPageName({ url, name }: LandingPageNameProps) {
  return (
    <TableCell>
      <a className="hover:underline font-semibold" href={url}>
        {name}
      </a>
    </TableCell>
  );
}
