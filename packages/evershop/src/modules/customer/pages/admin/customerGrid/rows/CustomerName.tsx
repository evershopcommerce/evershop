import React from 'react';

interface CustomerNameProps {
  name: string;
  url: string;
}

export function CustomerName({ url, name }: CustomerNameProps) {
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
