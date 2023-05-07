/* eslint-disable react/no-array-index-key */
/* eslint-disable react/jsx-closing-tag-location */
import PropTypes from 'prop-types';
import React from 'react';

export function Thumbnail({ imageUrl, qty }) {
  return (
    <td>
      <div className="product-thumbnail">
        <div className="thumbnail">
          {imageUrl && <img src={imageUrl} alt="" />}
          {!imageUrl && (
            <svg
              style={{ width: '2rem' }}
              fill="currentcolor"
              viewBox="0 0 20 20"
              focusable="false"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M6 11h8V9H6v2zm0 4h8v-2H6v2zm0-8h4V5H6v2zm6-5H5.5A1.5 1.5 0 0 0 4 3.5v13A1.5 1.5 0 0 0 5.5 18h9a1.5 1.5 0 0 0 1.5-1.5V6l-4-4z"
              />
            </svg>
          )}
        </div>
        <span className="qty">{qty}</span>
      </div>
    </td>
  );
}

Thumbnail.propTypes = {
  imageUrl: PropTypes.string,
  qty: PropTypes.number.isRequired
};

Thumbnail.defaultProps = {
  imageUrl: undefined
};
