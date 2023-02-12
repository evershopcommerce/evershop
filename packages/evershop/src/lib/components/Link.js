import PropTypes from 'prop-types';
import React from 'react';

export default function Link({ crossOrigin = 'anonymous', href, rel, type }) {
  return <link rel={rel} href={href} crossOrigin={crossOrigin} type={type} />;
}

Link.propTypes = {
  crossOrigin: PropTypes.string,
  href: PropTypes.string.isRequired,
  rel: PropTypes.string,
  type: PropTypes.string
};

Link.defaultProps = {
  crossOrigin: undefined,
  rel: undefined,
  type: undefined
};
