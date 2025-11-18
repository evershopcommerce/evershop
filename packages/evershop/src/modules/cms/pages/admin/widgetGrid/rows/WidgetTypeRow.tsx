import React from 'react';

interface WidgetTypeRowProps {
  code: string;
  types: Array<{
    code: string;
    name: string;
  }>;
}

export function WidgetTypeRow({ code, types }: WidgetTypeRowProps) {
  const type = types.find((t) => t.code === code);
  if (!type) {
    return (
      <td>
        <div>Unknown</div>
      </td>
    );
  } else {
    return (
      <td>
        <div>{type.name}</div>
      </td>
    );
  }
}
