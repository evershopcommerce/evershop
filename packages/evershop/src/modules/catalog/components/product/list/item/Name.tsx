import React from 'react';

interface NameProps {
  name: string;
  url: string;
}

function Name({ name, url }: NameProps) {
  return (
    <div className="product-name product-list-name mt-2 mb-1">
      <a href={url} className="font-bold hover:underline h5">
        <span>{name}</span>
      </a>
    </div>
  );
}

export { Name };
