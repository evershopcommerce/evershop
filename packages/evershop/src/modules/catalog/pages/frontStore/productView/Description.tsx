import { Editor } from '@components/common/Editor.js';
import { Row } from '@components/common/form/Editor.js';
import React from 'react';

interface DescriptionProps {
  product: {
    description: Array<Row>;
  };
}
export default function Description({
  product: { description }
}: DescriptionProps) {
  return (
    <div className="mt-5 md:mt-7">
      <div className="product-description">
        <Editor rows={description} />
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'productPageMiddleRight',
  sortOrder: 50
};

export const query = `
  query Query {
    product (id: getContextValue('productId')) {
      description
    }
  }`;
