import PropTypes from 'prop-types';
import React from 'react';


export default function Title({ title }) {
  return <h3 className="page-title">{title}</h3>;
}

Title.propTypes = {
  title: PropTypes.string.isRequired
};
