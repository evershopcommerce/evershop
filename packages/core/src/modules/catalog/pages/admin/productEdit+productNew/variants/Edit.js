import React from 'react';
import { Variants } from './Variants';

export function Edit({ variants, variantAttributes }) {
  return (
    <Variants
      variantProducts={variants || []}
      variantAttributes={variantAttributes || []}
    />
  );
}
