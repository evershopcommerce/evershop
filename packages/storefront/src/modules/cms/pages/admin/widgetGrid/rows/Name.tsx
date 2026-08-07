import React from 'react';

interface NameProps {
  url: string;
  name: string;
}

export function Name({ url, name }: NameProps) {
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
