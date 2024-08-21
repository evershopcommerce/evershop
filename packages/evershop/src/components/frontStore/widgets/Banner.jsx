import React from 'react';
import PropTypes from 'prop-types';

export default function Banner({ banner }) {
  return <div>{banner}</div>;
}

Banner.propTypes = {
  banner: PropTypes.string
};

Banner.defaultProps = {
  banner: ''
};
