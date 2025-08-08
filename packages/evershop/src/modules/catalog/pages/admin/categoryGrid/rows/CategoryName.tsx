import React from 'react';

interface CategoryNameRowProps {
  category: {
    editUrl: string;
    path: Array<{ name: string }>;
  };
}

export function CategoryNameRow({ category }: CategoryNameRowProps) {
  return (
    <td>
      <div>
        <a className="hover:underline font-semibold" href={category.editUrl}>
          {category.path.map((p) => p.name).join(' / ')}
        </a>
      </div>
    </td>
  );
}
