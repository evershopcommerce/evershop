import PropTypes from 'prop-types';
import React from 'react';

export default function ThumbnailRow({ src, name }) {
  return (
    <td>
      <div
        className="grid-thumbnail text-border border border-divider p-075 rounded flex justify-center"
        style={{ width: '6rem', height: '6rem' }}
      >
        {src && <img className="self-center" src={src} alt={name} />}
        {!src && (
          <svg
            className="self-center"
            xmlns="http://www.w3.org/2000/svg"
            width="2rem"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        )}
      </div>
    </td>
  );
}

ThumbnailRow.propTypes = {
  src: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired
};
