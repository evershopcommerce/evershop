import React from 'react';

interface CollectionNameRowProps {
  name: string;
  url: string;
}

export function CollectionNameRow({ name, url }: CollectionNameRowProps) {
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
