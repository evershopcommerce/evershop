import PropTypes from 'prop-types';
import React from 'react';

function Spinner({ 
  height,
  width
}) {
  return (
    <svg
      display="block"
      height={height}
      preserveAspectRatio="xMidYMid"
      style={{ margin: 'auto' }}
      viewBox="0 0 100 100"
      width={width}
      xmlns="http://www.w3.org/2000/svg"
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

export default Spinner;
Spinner.defaultProps = {
  height: 60,
  width: 60
}

Spinner.propTypes = {
  height: PropTypes.number,
  width: PropTypes.number
}
