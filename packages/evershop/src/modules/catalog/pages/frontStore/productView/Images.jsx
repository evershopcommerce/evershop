/* eslint-disable jsx-a11y/anchor-is-valid */
/* eslint-disable react/no-array-index-key */
import NoThumbnail from '@components/frontStore/catalog/product/single/NoThumbnail';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';

function Current({ image }) {
  const [height, setHeight] = useState();

  useEffect(() => {
    setHeight(document.getElementById('product-current-image').offsetWidth);
  }, []);

  return (
    <div
      id="product-current-image"
      style={{ minHeight: height, background: '#f6f6f6' }}
      className="product-image product-single-page-image flex justify-center items-center"
    >
      {image && (
        <img src={image.single} alt={image.alt} className="self-center" />
      )}
      {!image && <NoThumbnail width={250} height={250} />}
    </div>
  );
}

Current.propTypes = {
  image: PropTypes.shape({
    alt: PropTypes.string,
    single: PropTypes.string.isRequired
  }).isRequired
};

export default function Images({ product: { uuid, image, gallery = [] } }) {
  const [current, setCurrent] = React.useState(image);
  const [thumbs, setThumbs] = React.useState(() => {
    if (image) {
      // Add image to beginning of gallery
      gallery.unshift(image);
    }
    return gallery;
  });

  React.useEffect(() => {
    setCurrent(image);
    setThumbs(() => {
      const gls = [...gallery];
      if (image) {
        // Add image to beginning of gallery
        gls.unshift(image);
      }
      return gls;
    });
  }, [uuid]);

  return (
    <div className="product-single-media">
      <Current image={current} />
      <ul className="more-view-thumbnail product-gallery mt-2 grid grid-cols-4 gap-1">
        {thumbs.map((i, j) => (
          <li key={j} className="flex justify-center items-center">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setCurrent({ ...i });
              }}
              className=""
            >
              <img className="self-center" src={i.thumb} alt={i.alt} />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

Images.propTypes = {
  product: PropTypes.shape({
    uuid: PropTypes.string.isRequired,
    image: PropTypes.shape({
      alt: PropTypes.string,
      single: PropTypes.string.isRequired
    }),
    gallery: PropTypes.arrayOf(
      PropTypes.shape({
        alt: PropTypes.string,
        single: PropTypes.string.isRequired
      })
    )
  }).isRequired
};

export const layout = {
  areaId: 'productPageMiddleLeft',
  sortOrder: 10
};

export const query = `
  query Query {
    product (id: getContextValue('productId')) {
      uuid
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
}`;
