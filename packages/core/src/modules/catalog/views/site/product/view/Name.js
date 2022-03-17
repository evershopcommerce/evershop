import PropTypes from 'prop-types';
import React from 'react';

function Name({ name }) {
  return <h1>{name}</h1>;
}

Name.propTypes = {
  name: PropTypes.string
};

Name.defaultProps = {
  name: ''
};

export default Name;
