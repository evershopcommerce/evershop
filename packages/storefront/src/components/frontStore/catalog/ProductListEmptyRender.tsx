import React, { ReactNode } from 'react';

export const ProductListEmptyRender = ({
  message
}: {
  message: string | ReactNode;
}) => {
  return (
    <div className="empty-product-list">
      {typeof message === 'string' ? <p>{message}</p> : message}
    </div>
  );
};
