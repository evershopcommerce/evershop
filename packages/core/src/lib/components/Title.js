import PropTypes from 'prop-types';
import React from 'react';

export default function Title({ title }) {
  return <title>{title}</title>;
}

Title.propTypes = {
  title: PropTypes.string.isRequired
};
