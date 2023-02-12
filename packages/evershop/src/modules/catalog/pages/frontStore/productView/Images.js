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
    <div
      id="product-current-image"
      style={{ minHeight: height, background: '#f6f6f6' }}
      className="product-image product-single-page-image flex justify-center items-center"
    >
      {image && (
        <img src={image.single} alt={image.alt} className="self-center" />
      )}
      {!image && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="#111"
          width={100}
          height={100}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
          />
        </svg>
      )}
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
