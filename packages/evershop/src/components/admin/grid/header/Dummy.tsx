import React from 'react';

export function DummyColumnHeader({ title }: { title: string }) {
  return (
    <th className="column">
      <div className="font-medium uppercase text-xl">
        <span>{title}</span>
      </div>
    </th>
  );
}
