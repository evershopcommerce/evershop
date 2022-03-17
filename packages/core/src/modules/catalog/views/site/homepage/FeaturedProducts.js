import React from 'react';
import { useAppState } from '../../../../../lib/context/app';
import { get } from '../../../../../lib/util/get';
import ProductList from '../product/list/List';

export default function FeaturedProducts() {
  const context = useAppState();
  const products = get(context, 'featuredProducts', []);
  return (
    <div className="pt-3">
      <div className="page-width">
        <h3 className="mt-3 mb-3 text-center uppercase h5 tracking-widest">Featured collection</h3>
        <ProductList products={products} />
      </div>
    </div>
  );
}
