/* eslint-disable jsx-a11y/anchor-is-valid */
/* eslint-disable react/no-array-index-key */
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';

function Current({ image }) {
  const [height, setHeight] = useState();

  useEffect(() => {
    setHeight(document.getElementById('product-current-image').offsetWidth);
  }, []);

  return (
    <div id="product-current-image" style={{ minHeight: height, background: '#f6f6f6' }} className="product-image product-single-page-image flex justify-center">
      <img src={image.single} alt={image.alt} className="self-center" />
    </div>
  );
}

Current.propTypes = {
  image: PropTypes.shape({
    alt: PropTypes.string,
    single: PropTypes.string.isRequired
  }).isRequired
};

export default function Images({ product: { image, gallery } }) {
  const [current, setCurrent] = React.useState(image);

  return (
    <div className="product-single-media">
      <Current image={image} />
      <ul className="more-view-thumbnail product-gallery mt-2 grid grid-cols-4 gap-1">
        {gallery.map((i, j) => <li key={j}><a href="#" onClick={(e) => { e.preventDefault(); setCurrent({ ...i }); }} className="flex justify-center"><img className="self-center" src={i.thumb} alt={i.alt} /></a></li>)}
      </ul>
    </div>
  );
}

export const layout = {
  areaId: "productPageMiddleLeft",
  sortOrder: 10
}

export const query = `
  query Query {
    product (id: getContextValue('productId')) {
      image {
        alt
        thumb
        single
      }
      gallery {
        alt
        thumb
        single
      }
  }
}`