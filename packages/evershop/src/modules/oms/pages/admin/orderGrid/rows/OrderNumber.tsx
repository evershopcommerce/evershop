import React from 'react';

interface OrderNumberProps {
  editUrl: string;
  number: string;
}

export function OrderNumber({ editUrl, number }: OrderNumberProps) {
  return (
    <td>
      <div>
        <a className="hover:underline font-semibold" href={editUrl}>
          #{number}
        </a>
      </div>
    </td>
  );
}
