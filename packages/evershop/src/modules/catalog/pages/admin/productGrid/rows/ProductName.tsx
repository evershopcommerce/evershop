import React from 'react';

export interface ProductNameRowProps {
  name: string;
  url: string;
}
export function ProductNameRow({ url, name }: ProductNameRowProps) {
  return (
    <td>
      <div>
        <a className="hover:underline font-semibold" href={url}>
          {name}
        </a>
      </div>
    </td>
  );
}
