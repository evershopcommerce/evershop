import PropTypes from 'prop-types';
import React from 'react';

export default function Script({ src, isAsync }) {
  return src ? <script src={src} async={isAsync} /> : null;
}

Script.propTypes = {
  isAsync: PropTypes.bool,
  src: PropTypes.string.isRequired
};

Script.defaultProps = {
  isAsync: false
};
