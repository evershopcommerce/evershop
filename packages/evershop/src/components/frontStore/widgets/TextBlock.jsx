import React from 'react';
import PropTypes from 'prop-types';

export default function TextBlock({ text, className }) {
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: text }} />
  );
}

TextBlock.propTypes = {
  text: PropTypes.string,
  className: PropTypes.string
};

TextBlock.defaultProps = {
  text: '',
  className: ''
};
