/* eslint-disable jsx-a11y/anchor-is-valid */
/* eslint-disable react/no-array-index-key */
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { get } from '../../../../../../lib/util/get';

function Current({ image, alt }) {
  const [height, setHeight] = useState();

  useEffect(() => {
    setHeight(document.getElementById('product-current-image').offsetWidth);
  }, []);

  return (
    <div id="product-current-image" style={{ minHeight: height, background: '#f6f6f6' }} className="product-image product-single-page-image flex justify-center">
      <img src={image.single} alt={alt} className="self-center" />
    </div>
  );
}

Current.propTypes = {
  alt: PropTypes.string.isRequired,
  image: PropTypes.shape({
    single: PropTypes.string.isRequired
  }).isRequired
};

export default function Images() {
  const product = useSelector((state) => get(state, 'pageData.product', {}));
  const [current, setCurrent] = React.useState(product.gallery[0]);

  return (
    <div className="product-single-media">
      <Current image={current} alt={product.name} />
      <ul className="more-view-thumbnail product-gallery mt-2 grid grid-cols-4 gap-1">
        {product.gallery.map((i, j) => <li key={j}><a href="#" onClick={(e) => { e.preventDefault(); setCurrent({ ...product.gallery[j] }); }} className="flex justify-center"><img className="self-center" src={i.thumb} alt={product.name} /></a></li>)}
      </ul>
    </div>
  );
}
