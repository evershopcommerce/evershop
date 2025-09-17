import { ProductSorting } from '@components/frontStore/ProductSorting.js';
import React from 'react';

export default function SortingWrapper() {
  return <ProductSorting />;
}

export const layout = {
  areaId: 'rightColumn',
  sortOrder: 15
};
