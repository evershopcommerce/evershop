import { Image } from '@components/common/Image.js';
import React from 'react';

export interface ThumbnailProps {
  src?: string;
  name?: string;
}

export function Thumbnail({ src, name }: ThumbnailProps) {
  return (
    <td>
      <div
        className="grid-thumbnail text-border border border-divider p-2 rounded flex justify-center"
        style={{ width: '4rem', height: '4rem' }}
      >
        {src && (
          <Image
            className="self-center"
            src={src}
            alt={name || ''}
            width={100}
            height={100}
          />
        )}
        {!src && (
          <svg
            className="self-center"
            xmlns="http://www.w3.org/2000/svg"
            width="2rem"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        )}
      </div>
    </td>
  );
}
