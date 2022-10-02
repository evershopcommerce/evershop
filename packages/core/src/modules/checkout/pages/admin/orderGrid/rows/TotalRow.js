import PropTypes from 'prop-types';
import React from 'react';

export default function TotalRow({ total }) {
  return <td>{total}</td>;
}

TotalRow.propTypes = {
  total: PropTypes.string.isRequired
};
