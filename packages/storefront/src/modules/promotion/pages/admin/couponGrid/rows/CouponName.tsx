import React from 'react';

interface CouponNameProps {
  name: string;
  url: string;
}

export function CouponName({ url, name }: CouponNameProps) {
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
