import { MiniCart } from '@components/frontStore/cart/MiniCart.js';
import React from 'react';

interface MiniCartIconProps {
  cartUrl: string;
}
export default function MiniCartIcon({ cartUrl }: MiniCartIconProps) {
  return (
    <MiniCart className="flex justify-center items-center" cartUrl={cartUrl} />
  );
}

export const layout = {
  areaId: 'headerMiddleRight',
  sortOrder: 20
};

export const query = `
  query Query {
    cartUrl: url(routeId: "cart"),
  }
`;
