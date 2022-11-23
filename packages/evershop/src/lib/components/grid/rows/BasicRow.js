import PropTypes from 'prop-types';
import React from 'react';

export default function BasicRow({ id, areaProps }) {
  return <td>{areaProps.row[id]}</td>;
}

BasicRow.propTypes = {
  areaProps: PropTypes.shape({
    row: PropTypes.shape({
      id: PropTypes.string
    })
  }).isRequired,
  id: PropTypes.string.isRequired
};
