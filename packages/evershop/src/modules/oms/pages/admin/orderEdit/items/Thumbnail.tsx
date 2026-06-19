import { TableCell } from '@components/common/ui/Table.js';
import React from 'react';

interface ThumbnailProps {
  imageUrl?: string;
  qty: number;
}

export function Thumbnail({ imageUrl, qty }: ThumbnailProps) {
  return (
    <TableCell className="w-20">
      <div className="relative w-12 h-12 flex justify-center border border-divider rounded-[3px] p-0.5 box-border">
        <div className="self-center text-border">
          {imageUrl && (
            <img src={imageUrl} alt="" className="max-w-full h-auto" />
          )}
          {!imageUrl && (
            <svg
              className="w-8"
              fill="currentcolor"
              viewBox="0 0 20 20"
              focusable="false"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M6 11h8V9H6v2zm0 4h8v-2H6v2zm0-8h4V5H6v2zm6-5H5.5A1.5 1.5 0 0 0 4 3.5v13A1.5 1.5 0 0 0 5.5 18h9a1.5 1.5 0 0 0 1.5-1.5V6l-4-4z"
              />
            </svg>
          )}
        </div>
        <span className="block w-5 h-5 text-xs absolute -top-[0.8rem] -right-[0.8rem] bg-divider rounded-full text-center leading-tight pt-0.5">
          {qty}
        </span>
      </div>
    </TableCell>
  );
}
