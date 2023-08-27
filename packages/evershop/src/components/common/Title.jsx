import PropTypes from 'prop-types';
import React from 'react';

export default function Title({ title }) {
  return typeof title === 'string' ? <title>{title}</title> : null;
}

Title.propTypes = {
  title: PropTypes.string.isRequired
};
