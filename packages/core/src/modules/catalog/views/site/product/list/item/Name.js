import React from 'react';

function Name({ name, url, id }) {
  return (
    <div className="product-name product-list-name mt-1 mb-025">
      <a href={url} className="font-bold hover:underline h5"><span>{name}</span></a>
    </div>
  );
}
export { Name };
