import PropTypes from 'prop-types';
import React from 'react';


export function Name({ name }) {
  return <h1 className="product-single-name">{name}</h1>;
}

Name.propTypes = {
  name: PropTypes.string.isRequired
};
