import { MiniCart } from '@components/frontStore/cart/MiniCart.js';
import React from 'react';

interface MiniCartIconProps {
  cartUrl: string;
}
export default function MiniCartIcon({ cartUrl }: MiniCartIconProps) {
  return <MiniCart cartUrl={cartUrl} />;
}

export const layout = {
  areaId: 'headerMiddleRight',
  sortOrder: 10
};

export const query = `
  query Query {
    cartUrl: url(routeId: "cart"),
  }
`;
