import React from 'react';
import PropTypes from 'prop-types';

function Spinner({ width, height }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      style={{ margin: 'auto' }}
      width={width}
      height={height}
      display="block"
      preserveAspectRatio="xMidYMid"
      viewBox="0 0 100 100"
    >
      <g transform="translate(50 50) scale(.7)">
        <circle r="50" fill="#215d38" />
        <circle cy="-28" r="15" fill="#14a651">
          <animateTransform
            attributeName="transform"
            dur="1s"
            keyTimes="0;1"
            repeatCount="indefinite"
            type="rotate"
            values="0 0 0;360 0 0"
          />
        </circle>
      </g>
    </svg>
  );
}

Spinner.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number
};

Spinner.defaultProps = {
  width: 60,
  height: 60
};

export default Spinner;
