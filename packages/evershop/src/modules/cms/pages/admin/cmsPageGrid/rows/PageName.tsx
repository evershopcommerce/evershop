import React from 'react';

interface PageNameProps {
  url: string;
  name: string;
}

export function PageName({ url, name }: PageNameProps) {
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
