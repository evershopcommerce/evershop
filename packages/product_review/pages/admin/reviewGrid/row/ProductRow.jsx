import React from 'react';

function ProductRow({ product }) {
  return (
    <td width={'45%'}>
      <a href={product.editUrl}>{product.name}</a>
    </td>
  );
}

export default ProductRow;
