import React from 'react';
import { ProductSorting } from '@components/frontStore/ProductSorting.js';

export default function SortingWrapper() {
  return <ProductSorting />;
}

export const layout = {
  areaId: 'rightColumn',
  sortOrder: 15
};
