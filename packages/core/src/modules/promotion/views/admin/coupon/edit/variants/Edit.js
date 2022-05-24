import React from 'react';
import { useAppState } from '../../../../../../../lib/context/app';
import { get } from '../../../../../../../lib/util/get';
import { Variants } from './Variants';

export function Edit() {
  const context = useAppState();
  return (
    <Variants
      variantProducts={get(context, 'product.variants', [])}
      variantAttributes={get(context, 'product.variantAttributes', [])}
    />
  );
}
